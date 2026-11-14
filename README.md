# Panel MoSCoW para Claude Code

Un mod de Claude Code que abre un panel al lado del chat con las funcionalidades del PRD agrupadas en MUST, SHOULD y COULD, y el estado de cada una según sus fichas: sin ficha, Acordada, En construcción o Verificada.

El panel solo lee. No guarda nada propio ni deja cambiar estados: todo sale de `docs/prd.md` y de las fichas de `docs/features/`, y se actualiza solo cuando cambian.

## Instalación

En una sesión de Claude Code en el terminal:

```
/plugin install moscow-panel --marketplace polmarza/moscow-panel
```

Responde `y` para añadir el marketplace y elige dónde instalarlo (para todos tus proyectos o solo para este).

Desde una terminal normal:

```
claude plugin install moscow-panel --marketplace polmarza/moscow-panel
```

Los mods de Claude Code están en acceso anticipado: alguna actualización puede cambiar cómo funcionan.

## Qué necesita tu proyecto

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

- En un proyecto con `docs/prd.md`, el panel se abre solo al empezar la sesión. En cualquier otro, o si lo has cerrado, se abre con `/moscow`.
- Arriba, el recuento: cuántos requisitos están hechos, cuántos en curso y cuántos sin ficha.
- Al pulsar un requisito se despliega su criterio de aceptación y las fichas que lo cierran. Desde ahí puedes añadir al chat la ficha o la línea del requisito.

| Círculo | Estado |
|---|---|
| Vacío | Sin ficha |
| Con trama | Acordada |
| Medio lleno | En construcción |
| Lleno | Verificada |

## Desarrollo

- `hooks/board.ts` lee el PRD y las fichas y cruza los estados, sin tocar el disco.
- `hooks/dots.ts` dibuja los círculos.
- `hooks/register.tsx` abre el panel, registra `/moscow` y vigila los archivos cada dos segundos.
- `claude plugin test .` ejecuta las pruebas de `hooks/board.test.tsx`.
