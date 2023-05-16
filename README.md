### Prerequisities

1. Install `nvm`:
- `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash`

2. Switch to node v18:
- `nvm use 18`

3. Install `dfx`
- `DFX_VERSION=0.14.0 sh -ci "$(curl -fsSL https://sdk.dfinity.org/install.sh)"`

4. Add `dfx` to PATH:
- `echo 'export PATH="$PATH:$HOME/bin"' >> "$HOME/.bashrc"`

5. Create a project structure:
- create `src` dir
- create `index.ts` in the `src` dir
- create `tsconfig.json` in the root directory with the next content
```
{
    "compilerOptions": {
        "strict": true,
        "target": "ES2020",
        "experimentalDecorators": true,
        "strictPropertyInitialization": false,
        "moduleResolution": "node",
        "allowJs": true,
        "outDir": "HACK_BECAUSE_OF_ALLOW_JS",
        "allowSyntheticDefaultImports": true
    }
}
```
- create `dfx.json` with the next content
```
{
        "canisters": {
            "arest_api": {
                "type": "custom",
                "build": "npx azle arest_api",
                "root": "src",
                "ts": "src/index.ts",
                "candid": "src/index.did",
                "wasm": ".azle/arest_api/arest_api.wasm.gz"
            }
        }
    }
```
where `arest_api` is the name of the canister. 

6. Install Azle:
- `npm install azle`

7. Install the next npm packages:
- `@swc/core`
- `@swc/core-darwin-x64` for macos
- `url-pattern` - a url pattern matcher

8. Run local replica in background
- `dfx start`

9. Deploy a canister
- `dfx deploy`

10. After this, the canister can handle HTTP requests:
### get all products:
- `curl http://${CANISTER_ID}.localhost:4943/marketplace/products`

### create a product:
- `curl -X POST http://${CANISTER_ID}.localhost:4943/marketplace/products -d '{"id":"1","name":"hot-dog","price":"10","location":"Milky Way","description":"a tasty hot-dog","image":"http://path-to-the-product-id","owner":"a hot-dog shop"}' -H "Content-type: application/json"`

**response**: returns an inserted product.

### update a product:
- `curl -X PUT "http://qjdve-lqaaa-aaaaa-aaaeq-cai.localhost:4943/marketplace/products/1" -d '{"name":"hot-dog","price":"10","location":"Alpha Centauri","description":"a tasty hot-dog","image":"http://path-to-the-product-id","owner":"a hot-dog shop"}' -H "Content-type: application/json"`

**response**: returns an inserted product.

### delete a product:
- `curl -X DELETE "http://${CANISTER_ID}.localhost:4943/marketplace/products/1"`

**response**:
`{"data":{"id":"1","deleted":true}}`
