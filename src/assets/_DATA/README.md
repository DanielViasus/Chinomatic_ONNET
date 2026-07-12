# _DATA

Fuente principal:

- `GUNDAM_1.xlsx`

Archivos generados:

- `workbook-analysis.json`: resumen de todas las hojas, indicando cuales se exportaron y cuales se omitieron.
- `tables/index.json`: catalogo de tablas exportadas con nombre, columnas, filas y rutas de salida.
- `tables/*.json`: registros normalizados listos para consumo desde la app o scripts.
- `tables/*.csv`: exportacion tabular para revision manual o uso externo.

Hojas exportadas como tablas:

- `OLT`
- `CORRESPONDENCIA`
- `615`
- `PLANTILLA (TASK)`
- `RESPUESTAS (CSTASK)`
- `Listas`

Hojas omitidas en esta primera fase:

- `COLTEL`
- `PLANTILLA`
- `NORMALIZACION`
- `Matriz (N)`
- `Matriz (H)`

Motivo general de omision:

- contienen JSON incrustado, bloques narrativos o salidas matriciales que no se comportan como tablas normalizadas.
