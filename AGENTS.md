# FusionStructure — reglas persistentes

Este archivo define cómo trabajar en este repositorio. FusionStructure es experimental: ninguna carpeta, módulo, solver, esquema, worker, persistencia o superficie visual debe tratarse como definitiva.

## Autoridad

Cuando exista una discrepancia, el orden es:

1. código ejecutable y pruebas;
2. puertas automatizadas;
3. documentación canónica;
4. historial de Git;
5. planes, ideas o conversaciones anteriores.

Un plan no demuestra que algo esté implementado. La implementación y sus pruebas sí aportan evidencia, aunque una puerta verde tampoco convierte una función experimental en software profesional certificado.

## Sin áreas protegidas

No existe una política de archivos protegidos en este repositorio. Cualquier parte puede rediseñarse, reescribirse, reemplazarse o eliminarse cuando el cambio esté justificado y se actualicen sus referencias, migraciones, pruebas y documentación.

Esta regla es técnica y de proceso. No significa que desaparezcan la licencia MIT, los derechos de autor o las licencias de dependencias y estándares externos.

## Calidad mínima

La validación por defecto debe ser proporcional al cambio y consumir el mínimo tiempo posible.

- No ejecutar `npm run check`, la suite completa ni pruebas no relacionadas por rutina.
- Para UI 3D, cámara, paneles, estilos y composición: usar build/typecheck y revisión visual puntual sólo cuando aporten señal útil.
- Para solver 3D, matrices, unidades, apoyos, cargas, transformaciones, análisis o resultados: ejecutar únicamente las pruebas directamente relacionadas y un caso pequeño de referencia cuando cambie el comportamiento numérico.
- Para persistencia, migraciones o handoff entre productos: validar sólo el flujo tocado y comprobar conservación de datos.
- Ejecutar la suite completa únicamente si el usuario la pide, si se prepara una release importante o si el cambio es transversal y no puede aislarse de forma razonable.
- No crear pruebas nuevas para cambios puramente visuales salvo que exista una regresión concreta que convenga fijar.
- Indicar qué se verificó y qué no; no presentar como validado aquello que no se ejecutó.

La ausencia de una prueba no es evidencia de que la función funcione, pero tampoco justifica ejecutar pruebas irrelevantes.

## Dirección de producto

El producto se organiza alrededor de un proyecto común. Las futuras superficies deben poder relacionarse con:

- identidad, contexto, ubicación, unidades y fases;
- modelo físico y modelo analítico;
- entradas, hipótesis, resultados y procedencia;
- documentos, revisiones, incidencias y aprobaciones;
- cantidades, costos, recursos y programa;
- campo, seguridad, cambios y expediente final;
- educación, ejemplos y explicaciones.

Una feature nueva debe declarar qué entidad del proyecto modifica, qué validaciones necesita, cómo se deshace, cómo se guarda, cómo se exporta y cómo se prueba.

## Trabajo experimental

- Diferenciar siempre `Disponible`, `Experimental`, `Planeado` y `No comprometido`.
- No esconder limitaciones detrás de una interfaz pulida.
- No describir el producto como patentado, certificado, protegido o listo para obra si no existe evidencia específica.
- Mantener las unidades y las conversiones explícitas.
- Tratar resultados derivados como resultados versionados, no como datos de entrada.
- Preferir formatos abiertos y adaptadores aislados.
- Evitar que la interfaz sea la única fuente de reglas de negocio.

## Foundation local de Space3D

- `src/foundation/` pertenece únicamente a Space3D. Sus unidades y álgebra lineal son código local de este producto, no un paquete compartido ni una vía de compatibilidad entre productos.
- No agregar ni importar `@fusionstructure/foundation`. Tampoco importar internals de FStructure o Web, incluidos paths que salgan de este repositorio; el único intercambio permitido sigue siendo el handoff público versionado.
- Un cambio local de Foundation se valida y revisa sólo con las pruebas focalizadas necesarias de este repositorio. No requiere publicar Foundation ni abrir o esperar PRs/pruebas de productos hermanos.

## Flujo de cierre

El usuario autorizó actualizar el repositorio en esta sesión. Para cambios posteriores, no hacer push ni abrir un Pull Request salvo que se solicite explícitamente en esa sesión.

Si el cambio toca una superficie crítica, dejar una nota de decisión o una prueba reproducible. Si una verificación falla, reportar el fallo exacto y no presentarlo como éxito.
