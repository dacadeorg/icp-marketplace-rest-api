1. install Node.js via `nvm`
`curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash`

2. switch to node v18

3. install `dfx`
`DFX_VERSION=0.14.0 sh -ci "$(curl -fsSL https://sdk.dfinity.org/install.sh)"`

4. add `dfx` to PATH:
`echo 'export PATH="$PATH:$HOME/bin"' >> "$HOME/.bashrc"`

5. create a project structure:
a) create `src` dir
b) create `index.ts` in the `src` dir
c) create tsconfig.json in the root directory with the next content
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
d) create dfx.json with the next content
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

6. install Azle
`npm install azle`

7. install the next npm packages:
`@swc/core`
`@swc/core-darwin-x64` for macos
`url-pattern` - a url pattern matcher

8. run local replica in background
`dfx start`

9. deploy a canister
`dfx deploy`

10. after this, the canister can handle HTTP requests:

### get all products:
`curl http://${CANISTER_ID}.localhost:4943/marketplace/products`

### create a product:
`curl -X POST http://${CANISTER_ID}.localhost:4943/marketplace/products -d '{"id":"1","name":"hot-dog","price":"10","location":"Milky Way","description":"a tasty hot-dog","image":"http://path-to-the-product-id","owner":"a hot-dog shop"}' -H "Content-type: application/json"`

response: returns an inserted product.

### update a product:
`curl -X PUT "http://qjdve-lqaaa-aaaaa-aaaeq-cai.localhost:4943/marketplace/products/1" -d '{"name":"hot-dog","price":"10","location":"Alpha Centauri","description":"a tasty hot-dog","image":"http://path-to-the-product-id","owner":"a hot-dog shop"}' -H "Content-type: application/json"`

response: returns an inserted product.

### delete a product:
`curl -X DELETE "http://${CANISTER_ID}.localhost:4943/marketplace/products/1"`
response:
`{"data":{"id":"1","deleted":true}}`