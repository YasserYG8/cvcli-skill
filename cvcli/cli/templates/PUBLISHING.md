# How to share your terminal CV

Last reviewed: 2026-11-18. npm changes its rules sometimes. If a step does not work, check https://docs.npmjs.com/trusted-publishers.

Your package name: `%%NAME%%`. Your folder: `%%FOLDER%%`.

In this guide, `cvcli` means the tool that made this folder. If it is not installed, run it as `npx github:YasserYG8/cvcli-skill` (for example `npx github:YasserYG8/cvcli-skill pack CV.md --force`), or ask Claude Code with the cvcli skill to do it.

> **Privacy:** after step 2 or step 3, your CV is public. Anyone can download it, and npm makes it hard to remove a package. Only keep contact details in `cv.json` that you are happy to share. To change them, run `cvcli pack` again with `--force`.

You can stop after any step. Step 1 is enough to test. Step 2 is enough to share.

## Step 1: Test on your computer

From the folder that contains `%%FOLDER%%/`:

```bash
npx ./%%FOLDER%%
```

Check every section. To see the whole CV as text: `npx ./%%FOLDER%% --print`.

## Step 2: Share from GitHub (no npm account)

1. Create a new **public** repository on GitHub (for example `%%BIN%%`).
2. Push this folder to it:

   ```bash
   cd %%FOLDER%%
   git init
   git add .
   git commit -m "My terminal CV"
   git branch -M main
   git remote add origin https://github.com/<your-user>/<your-repo>.git
   git push -u origin main
   ```

3. Anyone can now run:

   ```bash
   npx github:<your-user>/<your-repo>
   ```

   (People who run it need git installed.)

The "Check CV package" workflow runs on every push. If it is red in the **Actions** tab, read its message: it tells you what is missing.

## Step 3: Publish on npm (optional)

Then anyone can run `npx %%NAME%%`, without git.

### 3.1 First publish (by hand, once)

1. Create a free account on https://www.npmjs.com/signup.
2. Check that the name is free:

   ```bash
   npm view %%NAME%%
   ```

   If you see `404 Not Found`, the name is free. If not, choose another name and run `cvcli pack <CV.md> --name <new-name> --force`.
3. Make sure `package.json` has a `repository` field that matches your GitHub repo **exactly**. If it is missing, run `cvcli pack <CV.md> --repo <your-user>/<your-repo> --force`, then commit and push.
4. Publish:

   ```bash
   npm login
   npm publish --access public
   ```

5. Test: `npx %%NAME%%`

### 3.2 Let GitHub publish the next versions (trusted publishing)

After the first publish, the package exists on npm, so you can connect it to GitHub. Then GitHub publishes for you, and no password or token is stored anywhere.

1. On npmjs.com, open your package, then **Settings** → **Trusted Publisher** → **GitHub Actions**.
2. Fill in: your GitHub user, your repository name, and the workflow file name `publish.yml`.
3. Save. Do the next publish (3.3) within 2 days, or the setting expires and you must add it again.

### 3.3 Update your CV later

1. Edit your `CV.md`.
2. Rebuild the package (your version and README are kept):

   ```bash
   cvcli pack <CV.md> --force
   ```

3. Raise the `"version"` in `package.json` (for example `1.0.0` → `1.0.1`).
4. Commit, then push a tag with the same version:

   ```bash
   git commit -am "Update CV"
   git tag v1.0.1
   git push && git push --tags
   ```

5. The "Publish to npm" workflow publishes it. Watch it in the **Actions** tab.

If the workflow says the tag does not match the version, the tag (`v1.0.1`) and `"version"` (`1.0.1`) are different. Fix the version, commit, and push a new tag.
