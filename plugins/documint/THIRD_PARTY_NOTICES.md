# Third-party bundled runtime notices

The bundled `documint-cli.cjs` is compiled from DocuMint code plus third-party dependencies used by the existing local analyzer and renderer.

- TypeScript compiler (Microsoft), Apache License 2.0: https://github.com/microsoft/TypeScript — license text is copied from the installed `node_modules/typescript/LICENSE.txt` during package generation.
- marked, MIT License: https://github.com/markedjs/marked — license text is copied from the installed marked package during package generation.

Runtime bundling uses esbuild as a build tool; esbuild itself is not included as a runtime dependency. See the package lock for resolved dependency versions.
