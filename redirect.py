from sanic import Sanic
from sanic import response as res
import aiohttp
import regex as re

app = Sanic('Server')
rdelm = '!'

default = 'xullua.com'

@app.listener('after_server_start')
async def after_server_start(_app, loop):
    app.ctx.session = aiohttp.ClientSession()

@app.route('/<path:path>')
async def root(req, path: str):
    redirects = {"": "https://xullua.com", **{i.split(rdelm)[0].lower(): i.split(rdelm)[1].replace('\n', '') for i in open('redirects.txt', encoding='utf-8').readlines() if len(i.split(rdelm)) > 1}}
    if path.lower() in redirects.keys():
        return res.redirect(redirects[path.lower()])
    return res.redirect(f"https://{default}/{path}?{req.query_string}", status=301)

app.run('0.0.0.0', 8000)