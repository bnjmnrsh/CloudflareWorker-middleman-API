/**
 * Cloudflare Worker middleman API
 * ex: https://YOURWORKER.YOURACCOUNT.workers.dev/?lat=28.385233&lon=-81.563873
 *
 * Environmental variable: WB_KEY
 *
 */

/* Run in console on one of your 'aAllowed origin' domains to test
fetch('https://YOURWORKER.YOURACCOUNT.workers.dev/?lat=28.385233&lon=-81.563873')
    .then(function (response) {
        if (response.ok) {
            return response.json()
        }
        return Promise.reject(response)
    })
    .then(function (data) {
        console.log(data)
        data.json()
    })
    .catch(function (error) {
        console.warn(error)
    })
 */

{
    // Debugging: set to true to disable origin whitelist checks
    const bDBG = false

    // Cache: The length of time for Cloudflare to perserve a cached value (Time To Live)
    const nTTL = 1800 // (seconds), 30 min
    // 25 min for Exirey headers
    const nCacheCont = new Date(new Date().getTime() + 25 * 60000)

    // A named array of endpoints to fetch from
    // prettier-ignore
    const aToFetch = [
        [
            'USEAGE',
            `https://api.weatherbit.io/v2.0/subscription/usage?key=${WB_KEY}&`,
        ],
        [
            'CURRENT',
            `https://api.weatherbit.io/v2.0/current?key=${WB_KEY}&`
        ],
        [
            'HOURLY',
            `https://api.weatherbit.io/v2.0/forecast/hourly?key=${WB_KEY}&hours=48&`,
        ],
        [
            'DAILY',
            `https://api.weatherbit.io/v2.0/forecast/daily?key=${WB_KEY}&days=16&`,
        ],
        [
            'ALERTS',
            `https://api.weatherbit.io/v2.0/alerts?key=${WB_KEY}&`
        ],
    ]

    // Allowed origins whitelist
    const aAllowed = ['https://YOURPROJECT.github.io']

    // Response headers
    const oInit = {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Allow-Headers': '*',
            'Cache-Control': 'public',
            Expires: `${nCacheCont}`,
            'content-type': 'application/json;charset=UTF-8',
        },
        cf: { cacheTtl: `${nTTL}`, cacheEverything: true },
    }

    /**
     * Gather returning response from Weatherbit API fetch request
     *
     * @param {Response object} response
     * @returns {JSON string}
     */
    async function fGatherResponse(response) {
        const { headers } = response
        const sContentType = headers.get('content-type') || ''
        const code = await response.status
        const text = await response.statusText
        const URL = await response.url.split('?')[0]

        // We're checking for JSON header as our api will return usefull details for , 2**, 4**
        if (sContentType.includes('application/json')) {
            return JSON.stringify(await response.json())
        } else {
            return JSON.stringify(
                {
                    error: `HTTP status: ${code} ${text}: URL: ${URL}`,
                },
                oInit
            )
        }
    }

    /**
     * Fetch json from Weatherbit APIs
     *
     * @param {object} request
     * @returns {JSON string}
     */
    async function fHandleRequest(event) {
        const oRequest = event.request

        // If origin domain is not whitelisted, return 403
        if (bDBG === false) {
            if (!aAllowed.includes(oRequest.headers.get('origin'))) {
                return new Response(
                    'Requests are not allowed from this domain.',
                    {
                        status: 403.503,
                        statusText: 'Not a whitelisted domain.',
                    }
                )
            }
        }

        const oHeaders = new Headers(oInit.headers)
        const { searchParams } = new URL(oRequest.url)

        // Capture and process any custom flags
        // const foo = searchParams.get('foo')
        // if (foo){
        //     console.log(foo)
        // }

        // Fetch from all the APIs
        const aResponses = await Promise.all(
            aToFetch.map(function (aURL, i) {
                return fetch(aURL[1] + searchParams.toString(), oInit)
                    .then((oResponse) => {
                        return oResponse
                    })
                    .catch(function (oError) {
                        console.error('aResponses error', oError)
                    })
            })
        )

        // Gather responses into a results array
        const aResults = await Promise.all(
            aResponses.map((resp) => fGatherResponse(resp))
        )

        /**
         * Collate results into new object
         *
         * return {object}
         */
        const fCollated = function () {
            let oColated = {}
            aResults.map((el, i) => {
                try {
                    JSON.parse(el)
                } catch (oError) {
                    console.error('fCollated error', oError)
                    return (oColated[aToFetch[i][0]] = {
                        error: `Error collating: ${oError}`,
                    })
                }
                oColated[aToFetch[i][0]] = JSON.parse(el)
            })
            return oColated
        }

        return new Response(JSON.stringify(fCollated()), oInit)
    }

    // Event listener
    addEventListener('fetch', (oEvent) => {
        return oEvent.respondWith(fHandleRequest(oEvent))
    })
}
