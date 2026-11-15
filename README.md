# Panel MoSCoW para Claude Code

Un mod de Claude Code que abre un panel al lado del chat con las funcionalidades del PRD agrupadas en MUST, SHOULD y COULD, y el estado de cada una según sus fichas: sin ficha, Acordada, En construcción o Verificada.

El panel solo lee. No guarda nada propio ni deja cambiar estados: todo sale de `docs/prd.md` y de las fichas de `docs/features/`, y se actualiza solo cuando cambian.

[![El panel al lado del chat: cambias una ficha y el panel se entera; pulsas un requisito y lo añades al chat](https://raw.githubusercontent.com/polmarza/mod-moscow-panel/media/demo.gif)](https://github.com/polmarza/mod-moscow-panel/blob/media/moscow-panel.mp4)

[Vídeo completo con sonido (1 min)](https://github.com/polmarza/mod-moscow-panel/blob/media/moscow-panel.mp4)

## Instalación

En una sesión de Claude Code en el terminal:

```
/plugin marketplace add polmarza/mod-moscow-panel
/plugin install moscow-panel@moscow-panel
```

El primer comando añade el repositorio como marketplace; en el segundo eliges dónde instalarlo (para todos tus proyectos o solo para este).

Desde una terminal normal:

```
claude plugin marketplace add polmarza/mod-moscow-panel
claude plugin install moscow-panel@moscow-panel
```

Los mods de Claude Code están en acceso anticipado: alguna actualización puede cambiar cómo funcionan.

## Qué necesita tu proyecto

![El panel cruza los requisitos de docs/prd.md con el estado de las fichas de docs/features/](https://raw.githubusercontent.com/polmarza/mod-moscow-panel/media/de-donde-salen-los-datos.png)

El formato es el de [project-template](https://github.com/polmarza/project-template). Si no la usas, bastan dos convenciones:

1. En `docs/prd.md`, cada funcionalidad en una línea con su ID entre corchetes y en negrita, seguida de su criterio de aceptación:

   ```
   - **[M-01] Registro con email** — Dado un visitante, cuando se registra con un email válido, entonces recibe un correo de confirmación.
   ```

   Los prefijos son `M` (Must), `S` (Should) y `C` (Could). Los Won't no aparecen en el panel.

2. En cada ficha de `docs/features/` (todo `.md` menos el `README.md`), dos líneas:

   ```
   **Estado:** En construcción
   **Requisitos que cierra:** M-01, M-02
   ```

   El estado es `Acordada`, `En construcción` o `Verificada`. Si un requisito lo cierran varias fichas, el panel muestra el estado más avanzado.

## Uso

![El panel MoSCoW abierto al lado del chat de Claude Code, con el recuento de requisitos hechos, en curso y sin ficha](https://raw.githubusercontent.com/polmarza/mod-moscow-panel/media/panel.png)

- En un proyecto con `docs/prd.md`, el panel se abre solo al empezar la sesión. En cualquier otro, o si lo has cerrado, se abre con `/moscow`.
- Arriba, el recuento: cuántos requisitos están hechos, cuántos en curso y cuántos sin ficha.
- Al pulsar un requisito se despliega su criterio de aceptación y las fichas que lo cierran. Desde ahí puedes añadir al chat la ficha o la línea del requisito.

Cada círculo dice en qué estado está el requisito:

![Leyenda de los círculos: vacío, sin ficha; con trama, Acordada; medio lleno, En construcción; lleno, Verificada](https://raw.githubusercontent.com/polmarza/mod-moscow-panel/media/leyenda-panel.png)

## Desarrollo

- `hooks/board.ts` lee el PRD y las fichas y cruza los estados, sin tocar el disco.
- `hooks/dots.ts` dibuja los círculos.
- `hooks/register.tsx` abre el panel, registra `/moscow` y vigila los archivos cada dos segundos.
- `claude plugin test .` ejecuta las pruebas de `hooks/board.test.tsx`.
