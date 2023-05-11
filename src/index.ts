import {
    blob,
    nat16,
    $query,
    Record,
    Tuple,
    Vec,
    StableBTreeMap,
    Opt,
    match,
    $update
} from 'azle';
import encodeUtf8 from 'encode-utf8';
import decodeUtf8 from 'decode-utf8';
var UrlPattern = require('url-pattern');

type HttpResponse = Record<{
    status_code: nat16;
    headers: Vec<Tuple<[string, string]>>;
    body: blob;
    upgrade: Opt<boolean>;
}>;

type HttpRequest = Record<{
    method: string;
    url: string;
    headers: Vec<Tuple<[string, string]>>;
    body: blob;
    upgrade: Opt<boolean>;
}>;

/**
 * This type represents a product that can be listed on a marketplace.
 * It contains basic properties that are needed to define a product.
 */
type Product = Record<{
    id: string;
    name: string;
    price: string;
    location: string;
    description: string;
    image: string;
    owner: string;
}>;

class ID {
    id: string;
};

class Request {
    pathVariable?: ID
    payload?: object
};

class Response {
    data: object;
};

type Handler = {
    handle: (req: Request) => Response
    request: Request
}

/**
 * `productsStorage` - it's a key-value datastructure that is used to store products by sellers.
 * {@link StableBTreeMap} is a self-balancing tree that acts as a durable data storage that keeps data across canister upgrades.
 * For the sake of this contract we've chosen {@link PersistentUnorderedMap} as a storage for the next reasons:
 * - `insert`, `get` and `remove` operations have a constant time complexity - O(1)
 * 
 * Brakedown of the `StableBTreeMap<string, Product>` datastructure:
 * - the key of map is a `productId`
 * - the value in this map is a product itself `Product` that is related to a given key (`productId`)
 * 
 * Constructor values:
 * 1) 0 - memory id where to initialize a map
 * 2) 16 - it's a max size of the key in bytes.
 * 3) 1024 - it's a max size of the value in bytes. 
 * 2 and 3 are not being used directly in the constructor but the Azle compiler utilizes these values during compile time
 */
const productsStorage = new StableBTreeMap<string, Product>(0, 16, 1024);

const getProducts: (req: Request) => Response = () => {
    return { data: productsStorage.values() };
}

const getProduct: (req: Request) => Response = (req) => {
    const payload: ID = req.payload as ID;
    let response: Response;
    if (productsStorage.containsKey(payload.id)) {
        response = { data: productsStorage.get(payload.id) }
    } else {
        response = { data: { msg: `a product with id=${payload.id} not found` } }
    }
    return response;
}

const deleteProduct: (req: Request) => Response = (req) => {
    const payload = req.pathVariable as ID;
    let response: Response;
    const removedProduct = productsStorage.remove(payload.id);
    return match(removedProduct, {
        Some: (deletedProduct) => response = { data: { id: deletedProduct.id, deleted: true } },
        None: () => response = { data: { msg: `couldn't delete a product with id=${payload.id}. there is no such product.` } }
    });
};

const addProduct: (req: Request) => Response = (req) => {
    const payload: Product = req.payload as Product;
    let response: Response;
    if (productsStorage.containsKey(payload.id)) {
        response = { data: { msg: `a product id=${payload.id} already exists` } }
    } else {
        productsStorage.insert(payload.id, payload);
        response = { data: { product: payload } };
    }
    return response;
};

const updateProduct: (req: Request) => Response = (req) => {
    const payload: Product = req.payload as Product;
    payload.id = req.pathVariable?.id as string; // to prevent updates of the identifier
    let response: Response;
    if (productsStorage.containsKey(payload.id)) {
        productsStorage.insert(payload.id, payload);
        response = { data: { product: payload } };
    } else {
        response = { data: { msg: `couldn't update a product with id=${payload.id}. product not found` } }
    }
    return response;
};

$query;
export function http_request(req: HttpRequest): HttpResponse {
    /*
        Every HTTP request goes to `http_request` function even if it's
        a request that modifies the state - ["PUT", "POST", "DELETE"].
        In order to pass this request to `http_request_update` we need to 
        return an HttpResponse with the `upgrade` flag set to `true`.
        After this, `icx-proxy` will route this request to `http_request_update` 
        where one of the state-modifying requests should be handled properly.

    */
    if (["PUT", "POST", "DELETE"].includes(req.method)) {
        return {
            status_code: 200,
            headers: [["Content-type", "application/json"]],
            body: new Uint8Array(),
            upgrade: Opt.Some(true)
        };
    }
    if (req.method !== "GET") {
        return buildHttpResponse(400, { msg: "invalid get method" });
    }

    return match(handleGetRequest(req.method, req.url), {
        Some: (handler) => {
            const result = handler.handle(handler.request);
            return buildHttpResponse(200, result);
        },
        None: () => {
            return buildHttpResponse(400, { msg: "get handler not found" });
        }
    });
}

function handleGetRequest(method: string, path: string): Opt<Handler> {
    if (new UrlPattern("/marketplace/products").match(path)) {
        switch (method) {
            case "GET":
                return Opt.Some({
                    handle: getProducts,
                    request: {}
                });
        }
    } else if (new UrlPattern("/marketplace/products(/:id)").match(path)) {
        let match = new UrlPattern("/marketplace/products(/:id)").match(path);
        switch (method) {
            case "GET":
                return Opt.Some({
                    handle: getProduct,
                    request: {
                        pathVariable: match
                    }
                });
        }
    }
    return Opt.None;
}

$update;
export function http_request_update(req: HttpRequest): HttpResponse {
    if (["PUT", "POST", "DELETE"].indexOf(req.method) === -1) {
        return buildHttpResponse(400, { msg: "invalid update method" });
    }

    return match(handleUpdateRequest(req.method, req.url, req.body), {
        Some: (handler) => {
            const result = handler.handle(handler.request);
            return buildHttpResponse(200, result);
        },
        None: () => {
            return buildHttpResponse(400, { msg: "update handler not found" });
        }
    })
}

function handleUpdateRequest(method: string, path: string, body: blob): Opt<Handler> {
    if (new UrlPattern("/marketplace/products").match(path)) {
        switch (method) {
            case "POST":
                return Opt.Some({
                    handle: addProduct,
                    request: {
                        payload: JSON.parse(decodeUtf8(body))
                    }
                });
        }
    } else if (new UrlPattern("/marketplace/products(/:id)").match(path)) {
        let match = new UrlPattern("/marketplace/products(/:id)").match(path);
        switch (method) {
            case "DELETE":
                return Opt.Some({
                    handle: deleteProduct,
                    request: {
                        pathVariable: match,
                    }
                });
            case "PUT":
                return Opt.Some({
                    handle: updateProduct,
                    request: {
                        pathVariable: match,
                        payload: JSON.parse(decodeUtf8(body))
                    }
                });
        }
    }
    return Opt.None;
}

function buildHttpResponse(code: nat16, body: object): HttpResponse {
    return {
        status_code: code,
        headers: [["Content-type", "application/json"]],
        body: new Uint8Array(encodeUtf8(JSON.stringify(body))),
        upgrade: Opt.None
    };
}
