# ==================================================
# ORDEN DE EJECUCION RECOMENDADO (R / RStudio)
# ==================================================
# 1) Abre este archivo en RStudio.
# 2) Ejecuta TODO el script con Source (Ctrl+Shift+Enter) para evitar
#    errores por variables no creadas en bloques anteriores.
# 3) Si prefieres ejecutar por bloques, respeta este orden:
#    - Bloque "Instalacion y librerias"
#    - Bloque "Configuracion"
#    - Bloque "Carga y limpieza"
#    - Bloque "Seleccion de ventana comparable"
#    - Bloque "Formato largo para graficar"
#    - Bloque "Grafica"
# 4) Al terminar, se generan:
#    - comparacion_mongo_vs_multimetro.png
#    - mongo_periodo_comparable.csv
#
# Nota: Si cambias los nombres de archivos o columnas, vuelve a ejecutar
# desde el inicio para refrescar todo el pipeline.

# =========================
# Instalacion y librerias
# =========================
required_packages <- c("readxl", "dplyr", "tidyr", "lubridate", "ggplot2", "scales")
missing_packages <- required_packages[!required_packages %in% rownames(installed.packages())]

if (length(missing_packages) > 0) {
  message("Instalando paquetes faltantes: ", paste(missing_packages, collapse = ", "))
  install.packages(missing_packages, repos = "https://cloud.r-project.org")
}

suppressPackageStartupMessages({
  library(readxl)
  library(dplyr)
  library(tidyr)
  library(lubridate)
  library(ggplot2)
  library(scales)
})

# Convierte texto/mixto a numerico de forma robusta (soporta coma decimal).
to_numeric_safe <- function(x) {
  x_chr <- trimws(as.character(x))
  x_chr <- gsub(",", ".", x_chr, fixed = TRUE)
  x_chr <- gsub("[^0-9\\.-]", "", x_chr)
  suppressWarnings(as.numeric(x_chr))
}

# =========================
# Configuracion
# =========================
archivo_mongo <- "dbexperimental1.xlsx"
archivo_real <- "dbreal1.xlsx"
zona_horaria_local <- "America/Bogota"

salida_plot <- "comparacion_mongo_vs_multimetro.png"
salida_mongo_filtrado <- "mongo_periodo_comparable.csv"

# =========================
# Carga y limpieza
# =========================
mongo_raw <- read_excel(archivo_mongo)

names(mongo_raw) <- trimws(names(mongo_raw))

# readxl puede reparar nombres duplicados como "voltaje_bateria...4".
# Aqui se quita ese sufijo y se conserva la primera aparicion de cada columna base.
mongo_names_base <- sub("\\.\\.\\.[0-9]+$", "", names(mongo_raw))
mongo_raw <- mongo_raw[, !duplicated(mongo_names_base)]
names(mongo_raw) <- mongo_names_base[!duplicated(mongo_names_base)]

# Detecta columna temporal aunque venga con nombre alterno.
fecha_candidates <- names(mongo_raw)
fecha_norm <- tolower(fecha_candidates)

# readxl puede renombrar columnas duplicadas con sufijos como ...10.
fecha_col <- fecha_candidates[
  grepl("^recibido_en(\\.\\.\\.[0-9]+)?$", fecha_norm) |
    grepl("^recibido en(\\.\\.\\.[0-9]+)?$", fecha_norm) |
    grepl("^fecha y hora(\\.\\.\\.[0-9]+)?$", fecha_norm) |
    grepl("^fecha_hora(\\.\\.\\.[0-9]+)?$", fecha_norm) |
    grepl("^fecha(\\.\\.\\.[0-9]+)?$", fecha_norm)
]

if (length(fecha_col) == 0) {
  stop(paste0(
    "No se encontro columna de fecha en Mongo. Columnas disponibles: ",
    paste(names(mongo_raw), collapse = ", ")
  ))
}

fecha_col <- fecha_col[1]

# El export incluye columnas duplicadas con sufijo .1; se eliminan.
mongo <- mongo_raw %>%
  rename(fecha_origen = all_of(fecha_col)) %>%
  mutate(
    recibido_en_utc = ymd_hms(as.character(fecha_origen), tz = "UTC"),
    recibido_en_local = with_tz(recibido_en_utc, tzone = zona_horaria_local),
    voltaje_panel = to_numeric_safe(voltaje_panel),
    voltaje_bateria = to_numeric_safe(voltaje_bateria)
  )

required_mongo_cols <- c("voltaje_panel", "voltaje_bateria")
missing_mongo_cols <- setdiff(required_mongo_cols, names(mongo))
if (length(missing_mongo_cols) > 0) {
  stop(paste0(
    "Faltan columnas clave en Mongo: ", paste(missing_mongo_cols, collapse = ", "),
    ". Columnas detectadas: ", paste(names(mongo), collapse = ", ")
  ))
}

if (!("voltaje_carga" %in% names(mongo))) {
  mongo <- mongo %>% mutate(voltaje_carga = voltaje_bateria)
} else {
  mongo <- mongo %>% mutate(voltaje_carga = coalesce(to_numeric_safe(voltaje_carga), voltaje_bateria))
}

real <- read_excel(archivo_real) %>%
  mutate(
    fecha_hora = ymd_hms(`Fecha y Hora`, tz = zona_horaria_local),
    panel = to_numeric_safe(Panel),
    bateria = to_numeric_safe(Bateria),
    cargas = to_numeric_safe(Cargas)
  ) %>%
  select(fecha_hora, panel, bateria, cargas)

# =========================
# Seleccion de ventana comparable
# =========================
inicio_hora <- format(min(real$fecha_hora, na.rm = TRUE), "%H:%M:%S")
fin_hora <- format(max(real$fecha_hora, na.rm = TRUE), "%H:%M:%S")

mongo_window <- mongo %>%
  mutate(
    fecha = as_date(recibido_en_local),
    hora_dia = format(recibido_en_local, "%H:%M:%S")
  ) %>%
  filter(hora_dia >= inicio_hora, hora_dia <= fin_hora)

if (nrow(mongo_window) == 0) {
  stop("No hay registros de Mongo dentro de la ventana horaria del multimetro.")
}

fecha_mongo_elegida <- mongo_window %>%
  count(fecha, sort = TRUE) %>%
  slice(1) %>%
  pull(fecha)

mongo_periodo <- mongo_window %>%
  filter(fecha == fecha_mongo_elegida) %>%
  select(recibido_en_local, voltaje_panel, voltaje_bateria, voltaje_carga) %>%
  rename(
    fecha_hora = recibido_en_local,
    panel = voltaje_panel,
    bateria = voltaje_bateria,
    cargas = voltaje_carga
  ) %>%
  mutate(
    panel = to_numeric_safe(panel),
    bateria = to_numeric_safe(bateria),
    cargas = to_numeric_safe(cargas)
  )

if (nrow(mongo_periodo) == 0) {
  stop("La fecha elegida de Mongo quedo sin datos tras el filtrado.")
}

# Serie densa para Mongo: resumen por minuto para curva legible.
mongo_periodo_min <- mongo_periodo %>%
  mutate(minuto = floor_date(fecha_hora, unit = "minute")) %>%
  group_by(minuto) %>%
  summarise(
    panel = median(panel, na.rm = TRUE),
    bateria = median(bateria, na.rm = TRUE),
    cargas = median(cargas, na.rm = TRUE),
    .groups = "drop"
  ) %>%
  rename(fecha_hora = minuto)

# =========================
# Formato largo para graficar
# =========================
mongo_long <- mongo_periodo_min %>%
  mutate(origen = "MongoDB (sensores)") %>%
  pivot_longer(cols = c(panel, bateria, cargas),
               names_to = "canal",
               values_to = "voltaje")

real_long <- real %>%
  mutate(origen = "Multimetro (IRL)") %>%
  pivot_longer(cols = c(panel, bateria, cargas),
               names_to = "canal",
               values_to = "voltaje")

comparacion <- bind_rows(mongo_long, real_long) %>%
  mutate(
    hora_dia = as.POSIXct(format(fecha_hora, "%H:%M:%S"), format = "%H:%M:%S", tz = "UTC"),
    canal = recode(canal,
                   panel = "Panel",
                   bateria = "Bateria",
                   cargas = "Cargas")
  )

# =========================
# Grafica
# =========================
p <- ggplot(comparacion, aes(x = hora_dia, y = voltaje, color = origen, group = origen)) +
  geom_line(linewidth = 0.9, alpha = 0.9) +
  geom_point(data = subset(comparacion, origen == "Multimetro (IRL)"),
             size = 2.4) +
  facet_wrap(~ canal, ncol = 1, scales = "free_y") +
  scale_x_datetime(date_labels = "%H:%M", date_breaks = "30 min") +
  scale_color_manual(values = c("MongoDB (sensores)" = "#2F80ED",
                                "Multimetro (IRL)" = "#D35400")) +
  labs(
    title = "Comparacion de voltaje vs tiempo",
    subtitle = paste0(
      "Mongo elegido: ", fecha_mongo_elegida,
      " (", nrow(mongo_periodo), " registros crudos, ", nrow(mongo_periodo_min), " por minuto)"
    ),
    x = "Hora del dia",
    y = "Voltaje (V)",
    color = "Fuente"
  ) +
  theme_minimal(base_size = 12) +
  theme(
    legend.position = "top",
    panel.grid.minor = element_blank()
  )

ggsave(salida_plot, p, width = 12, height = 9, dpi = 150)
write.csv(mongo_periodo, salida_mongo_filtrado, row.names = FALSE)

cat("\n=== Resumen comparacion ===\n")
cat("Ventana horaria IRL:", as.character(inicio_hora), "a", as.character(fin_hora), "\n")
cat("Fecha Mongo elegida:", as.character(fecha_mongo_elegida), "\n")
cat("Registros Mongo crudos en ventana:", nrow(mongo_periodo), "\n")
cat("Registros Mongo agregados por minuto:", nrow(mongo_periodo_min), "\n")
cat("Registros IRL:", nrow(real), "\n")
cat("\nArchivos generados:\n")
cat("-", salida_plot, "\n")
cat("-", salida_mongo_filtrado, "\n")