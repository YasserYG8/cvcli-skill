# %%DISPLAY_NAME%%: CV in the terminal

Run my CV in your terminal (Node.js 18+ needed):

```bash
# From GitHub (no install; needs git)
npx github:%%REPO%%

# From npm (only if it is published there)
npx %%NAME%%
```
%%REPO_NOTE%%
The first time, npx asks `Ok to proceed? (y)`. This is normal: it downloads this small package (no dependencies) and runs it.

Keys: press a letter to open a section, use the arrows to move and scroll, `t` to change the layout, `q` to quit.
To start with another layout: add `--layout sidebar`, `--layout classic` or `--layout manpage`.
To print the whole CV as text: add `--print` (for example `npx %%NAME%% --print`).

---

Made with [cvcli](%%CVCLI_URL%%). To update this CV, see [PUBLISHING.md](PUBLISHING.md).
