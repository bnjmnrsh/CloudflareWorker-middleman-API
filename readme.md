# A simple middleman API boilerplate for Cloudflare Workers

A recipe for a light middleman API using [Cloudflare Workers](https://blog.Cloudflare.com/introducing-Cloudflare-workers/), which includes whitelisting origin requests, fetching multiple third party endpoints, caching, and a single collated JSON response. PR's welcome.

## Why?

### Keeping secrets, secret 👮🏼‍♂️

With Cloudflare Workers we can leverage [environmental variables](https://developers.Cloudflare.com/workers/platform/environments) and [secrets](https://developers.Cloudflare.com/workers/cli-wrangler/commands#secret) [1](https://blog.Cloudflare.com/workers-secrets-environment/), to keep these details out of your HTTP requests, code base and repos. 🎉

### Simplicity & Cost 💰

Cloudflare Workers are 'serverless', written in JavaScript, and are easy to spool up. This cuts out the setup and maintenance overhead of complex tooling. Cloudflare's generous free tier makes them perfect for side projects, Github Pages, etc.

### Speed 🏎

Cloudflare's global network of low latency servers ensures that your requests are handeled by a hub nearest to your users. Further, any subsequent 3rd party API fetch calls your worker make, use Cloudfare's best-in-class global network, resulting in flaming hot tacos for response times 🌮🌮 (and who doesn't like tacos).

Anecdotal experience based on flaky broadband in rural Scotland, and an even shoddier 3G network _prove™️_ that this middleman API approach greatly improved the responsiveness of my apps, especially when collating two or more asynchronous fetch requests. Also, I can now run faster, can learn a new languages in a day, and have lasers for eyes .... your millage may vary. 🏃🏼‍♂️ 🕶️

## What's included?

### Roll your own API from multiple sources 🚪🚪🚪

The `aToFetch` array provides a mechanism for naming multiple API endpoints, and all the responses are returned as one unified JSON object.

### Hotlink protection ⛓️⛓️

You can also check the IP address of incoming requests, if its not from one of your whitelisted origins (ie your app), it's rejected with a `403` response -- No tacos for you sir/mam!

### Caching 🚤

While Cloudflare Workers do have access to the powerful cache-control features of the [Cache API](https://developers.Cloudflare.com/workers/runtime-apis/cache), for Workers using [fetch](https://developers.Cloudflare.com/workers/learning/how-the-cache-works#fetch), (as we are), Cloudflare offers [a simplified caching API](https://developers.Cloudflare.com/workers/examples/cache-using-fetch).

### Errors 🚨

In addition to console logs in the Workers Quick Edit interface, HTTP and upstream API errors are passed through to the response object with handle-able `{'errror': response}` entries for each request. A single non-responsive endpoint won't bring the whole thing down.

## What cooking in this recipe? 🍲 🥘

In this recipe, for demonstration we use the [WeatherBit.io](https://www.weatherbit.io/) APIs, and we keep the API key hidden in a [environment variable](https://gomakethings.com/how-to-use-environment-variables-with-Cloudflare-workers-and-vanilla-js/).

You'll need to:
1. Have a [Cloudflare Workers account](https://dash.Cloudflare.com/sign-up/workers)
2. An API key from [WeatherBit.io](https://www.weatherbit.io/)
3. Create a new Worker
4. Create an environmental variable on this worker named `WB_KEY` for your shiny new API key.

Once your worker is published, try running the URL for it in your browser: `https://YOURWORKER.YOURACCOUNT.workers.dev`

Your should receive the following response:

>  **403 Not a whitelisted domain.** <br>
>  **content-length:** `42` <br>
>  **content-type:** `text/plain;charset=UTF-8` <br>
>  `Requests are not allowed from this domain -- no tacos for you!`<br>

Now set the variable  `bDBG = true` and re-run the request. You should now get the following:

> **200 OK** <br>
> **access-control-allow-headers:** `*` <br>
> **access-control-allow-methods:** `GET` <br>
> **access-control-allow-origin:** `*`<br>
> **content-length:** `381`<br>
> **content-type: **`application/json;charset=UTF-8` <br>
> {"USEAGE":{"calls_remaining":49756,"historical_calls_count":null,"calls_count":"244","calls_reset_ts":1616457599,"historical_calls_reset_ts":null,"historical_calls_remaining":null},"CURRENT":{"error":"Invalid Parameters supplied."}, "HOURLY":{"error":"Invalid Parameters supplied."}, "DAILY":{"error":"Invalid Parameters supplied."}, "ALERTS":{"error":"Invalid Parameters supplied."}}

The WeatherBit API requires a location in order to do its  `☀️ || ⛈` magic. Try adding longitude and latitude values:
`https://YOURWORKER.YOURACCOUNT.workers.dev/?lat=28.385233&lon=-81.563873`

> **200 OK** <br>
> **access-control-allow-headers:** `*` <br>
> **access-control-allow-methods: **`GET`<br>
> **access-control-allow-origin:** `*`<br>
> **content-length:** `381`<br>
> **content-type:** `application/json;charset=UTF-8`<br>
> {"USEAGE":{"calls_remaining":XXXX,"historical_calls_count":null,"call_count":"XXX","calls_reset_ts":XXXXXXX,"historical_calls_reset_ts":null,"historical_calls_remaining":null},"CURRENT":{"data": ⛄ ☀️⛅☔ } ... }

🍸!

## Testing

Once your API is live, you probably dont want to set the `bDBG` boolean variable to true again. However for quick checks for what your responses are, you can pop open the console in your browser, while on one of your white listed domains and run the following:

```
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
```

## What happens when... 🔥🔥🔥🔥

### What happens if my Cloudflare worker uses up its quota?

#### Burst Rates

At the time of writing, free Workers plans are subject to burst limits of 1,000 requests per minute. Beyond this, the Worker will return a HTTP `429` response, which your application should handle gracefully.

#### Daily Limits

At the time of writing, free Workers plans are subject to daily request limit of 100,000 requests.  How requests greater then 100,000 a day are handled depends on how routes are set up in your worker. For our purposes the default 'Fail closed' will respond as if there is no worker at all, returning a HTTP `552` status code, which your application should handle gracefully.

Details on limits: [Workers Limits](https://developers.Cloudflare.com/workers/platform/limits#request)

---

#### How many fetch sub-requests can I make on a CF Worker?

CF caps the number of subrequests [[1]](https://support.Cloudflare.com/hc/en-us/articles/360007553512-Cloudflare-analytics-with-Workers#h_2fFcubz4ukNYtTF18oZYXV) at 50, with each redirect counting towards this limit. This means that the total number of subrequests may be greater then the total number of `fetch(request)` calls in your Worker's code. [[2]](https://developers.Cloudflare.com/workers/platform/limits#how-many-subrequests-can-i-make)

#### What if I go over quota on one of my 3rd party APIs?

Third parties may handle this differently, though rejection will likely come in the form of some flavor of `4XX`, with `429 Too Many Requests` typical for rate limiting. As this example uses the WeatherBit API, instead of sending their typical `data` object, WeatherBit responds with:
`{ "status_code": 429, "status_message": "Your request count (1022) is over the allowed limit of 1000 per day - Upgrade your key, or retry after 848.16666666667 minutes" }`

But as you can see it still returns a valid JSON object. So long as the response is JSON, our example passes it along, for the client to handle. In this case testing for the lack of a `data` object and/or the presence of a `status_code` should be sufficient to handle the issue gracefully.

#### What if I am using sloooowApi.com?

CF states that the typical CPU runtime for a worker is less then one millisecond, with a cap of 10ms on the free tier and, 50ms on the "Bundled" tier [[3]](https://developers.Cloudflare.com/workers/platform/limits#cpu-runtime). So, long running compute processes have a hard celing, however this doesn't include response times. There's **no 'hard limit'** on the amount of "real time" a Worker may use waiting for a fetch response, as long as the client that made the request remains connected. [[4]](https://developers.Cloudflare.com/workers/platform/limits#how-long-can-a-subrequest-take)

## Further Reading

If you're new to Cloudflare Workers, these articlse are a good place to start:
- [Introducing Cloudflare Workers: Run JavaScript Service Workers at the Edge](https://blog.Cloudflare.com/introducing-Cloudflare-workers/)
- [How Workers Work](https://developers.Cloudflare.com/workers/learning/how-workers-works)

This project was greatly inspired by these two articles by Chris Ferdinandi, who provides a great intro to the subject:
- [Getting started with serverless using Cloudflare Workers and vanilla JS](https://gomakethings.com/getting-started-with-serverless-using-Cloudflare-workers-and-vanilla-js/)
- [How to create a middleman API with Cloudflare Workers and vanilla JS](https://gomakethings.com/how-to-create-a-middleman-api-with-Cloudflare-workers-and-vanilla-js/)

- Workers Docs: https://developers.Cloudflare.com/workers/
- Workers Examples: https://developers.Cloudflare.com/workers/examples
- Recipe Exchange: https://blog.Cloudflare.com/Cloudflare-workers-recipe-exchange

- Fetch JSON: https://developers.Cloudflare.com/workers/examples/fetch-json
- Return JSON: https://developers.Cloudflare.com/workers/examples/return-json

- Conditional Response: https://developers.Cloudflare.com/workers/examples/conditional-response
- Origin Proxy: https://developers.cloudflare.com/workers/examples/bulk-origin-proxy
- Hotlink Protection: https://developers.Cloudflare.com/workers/examples/hot-link-protection

- How Workers Cache works: https://developers.Cloudflare.com/workers/learning/how-the-cache-works
- Fetch Caching: https://developers.Cloudflare.com/workers/examples/cache-using-fetch
