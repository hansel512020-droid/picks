# Publicar la web

La app se compila a ficheros estáticos y se sirve desde cualquier sitio. Estas
son las piezas y el porqué de cada una.

## En Vercel

1. Entra en **vercel.com** con tu cuenta de GitHub.
2. **Add New → Project** y elige el repositorio `picks`.
3. Vercel lee `vercel.json` y ya sabe qué hacer, pero comprueba que ponga:
   - *Build Command*: `npx expo export --platform web`
   - *Output Directory*: `dist`
4. En **Environment Variables**, añade las tres del `.env` que empiezan por
   `EXPO_PUBLIC_`:

   ```
   EXPO_PUBLIC_SUPABASE_URL
   EXPO_PUBLIC_SUPABASE_ANON_KEY
   EXPO_PUBLIC_PAYPAL_CLIENT_ID
   ```

   **Solo esas tres.** Son públicas por diseño: viajan dentro del navegador de
   cualquiera que abra la web, y lo que protege la base de datos son las reglas
   RLS, no el secreto de la clave. El resto —`PAYPAL_SECRET`, la clave de
   servicio de Supabase— **no se pone aquí jamás**: esas viven en los secretos
   de Supabase y de GitHub, donde el navegador no llega.

5. **Deploy**.

`rewrites` manda todas las rutas a `index.html` porque la navegación la resuelve
la app en el navegador. Sin eso, entrar directo a `/pro` o recargar en
`/partido/algo` daría un 404 del servidor: esas direcciones no son ficheros.

## Después de publicar

Hay que decirle a los dos servicios cuál es la dirección nueva, o el inicio de
sesión y los pagos se quedan a medias:

- **Supabase** → *Authentication → URL Configuration*: pon la URL de Vercel en
  `Site URL` y en `Redirect URLs`. Sin esto, quien entre con Google vuelve a
  `localhost:8081` después de identificarse.
- **PayPal** → el webhook de producción debe apuntar a la función de Supabase,
  que no cambia. Ese ya está.

## Qué NO hace falta

No hay que republicar para actualizar resultados. La app se descarga los datos
de Supabase al abrir, y el flujo de trabajo `datos.yml` los refresca cada día.
Publicar solo hace falta cuando cambia el código.
