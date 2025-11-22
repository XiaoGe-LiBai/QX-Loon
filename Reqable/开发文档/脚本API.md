
> https://github.com/reqable/python-scripting-api

脚本框架中涉及的 python 类的 API 文档说明。

提示

*   从 v2.28.0 版本开始，所有类名移除了`Capture`前缀。
*   变量名斜体表示只读，粗体表示可覆写。

Context[​](#api-context "Context的直接链接")
---------------------------------------

<table><thead><tr><th>变量</th><th>类型</th><th>说明</th></tr></thead><tbody><tr><td><em>url</em></td><td>str</td><td>请求 url，只读。</td></tr><tr><td><em>scheme</em></td><td>str</td><td>请求标志符，值为 http 或 https，只读。</td></tr><tr><td><em>host</em></td><td>str</td><td>域名，只读。</td></tr><tr><td><em>port</em></td><td>int</td><td>端口号，只读。</td></tr><tr><td><em>cid</em></td><td>int</td><td>TCP 连接 ID，只读。</td></tr><tr><td><em>ctime</em></td><td>int</td><td>TCP 连接开始时间戳，单位毫秒，只读。</td></tr><tr><td><em>sid</em></td><td>int</td><td>HTTP 会话 ID，只读。</td></tr><tr><td><em>stime</em></td><td>int</td><td>HTTP 会话开始时间戳，单位毫秒，只读。</td></tr><tr><td><em>uid</em></td><td>str</td><td>HTTP 会话的唯一标志，由 <code>ctime</code> + <code>cid</code> + <code>sid</code> 组成。</td></tr><tr><td><strong>env</strong></td><td>dict</td><td>全局环境和当前已激活的自定义环境的变量合集。</td></tr><tr><td><em>app</em></td><td><a href="#api-app">App</a></td><td>应用（进程）信息，未获取到为 None。</td></tr><tr><td>highlight</td><td><a href="#api-highlight">Highlight</a></td><td>设置调试列表高亮属性，v2.28.0 版本新增。</td></tr><tr><td><strong>shared</strong></td><td>-</td><td>用于 <code>onRequest</code> 和 <code>onResponse</code> 之间共享数据的特殊变量，可以是 str、int、list 和 dict 等可自动序列化的变量。</td></tr></tbody></table>

代码示例：

```
def onRequest(context, request):
  # 打印url，例如：https://reqable.com/
  print(context.url)
  # 打印schema，例如：https
  print(context.scheme)
  # 打印host，例如：reqable.com
  print(context.host)
  # 打印port，例如：443
  print(context.port)
  # 打印TCP连接ID，例如：1
  print(context.cid)
  # 打印TCP连接开始时间，例如：1686711219444
  print(context.ctime)
  # 打印HTTP的会话ID，例如：1
  print(context.sid)
  # 打印HTTP的会话开始时间，例如：1686711224132
  print(context.stime)

  # 获取环境变量
  print(context.env['foo'])
  print(context.env['$timestamp'])

  # 写入环境变量（优先写入当前激活的自定义环境，没有激活环境则写入全局环境）
  context.env['foo'] = 'bar'

  # 设置请求红色高亮
  context.highlight = Highlight.red

  # 设置共享参数
  context.shared = 'Hello'

  # Done
  return request

def onResponse(context, response):
  #  打印共享参数，输出：Hello
  print(context.shared)
  return response
```

HttpRequest[​](#api-request "HttpRequest的直接链接")
-----------------------------------------------

<table><thead><tr><th>变量</th><th>类型</th><th>说明</th></tr></thead><tbody><tr><td><strong>method</strong></td><td>str</td><td>请求方法。</td></tr><tr><td><strong>path</strong></td><td>str</td><td>请求路径，注意不包含 query 部分。</td></tr><tr><td><em>protocol</em></td><td>str</td><td>请求的 HTTP 协议版本，只读。</td></tr><tr><td><strong>queries</strong></td><td><a href="#api-queries">HttpQueries</a></td><td>请求参数列表。</td></tr><tr><td><strong>headers</strong></td><td><a href="#api-headers">HttpHeaders</a></td><td>请求头列表。</td></tr><tr><td><strong>body</strong></td><td><a href="#api-body">HttpBody</a></td><td>请求体。</td></tr><tr><td><strong>trailers</strong></td><td><a href="#api-headers">HttpHeaders</a></td><td>请求尾部列表，参见 HTTP1 的 chunked trailers 或者 HTTP2 的 trailers。注意此功能待验证，暂时请勿使用。</td></tr><tr><td><em>contentType</em></td><td>str 或 None</td><td>请求类型（即 headers 中的 Content-Type 的值），只读。</td></tr><tr><td><em>mime</em></td><td>str 或 None</td><td>请求 MIME 类型，例如 application/json，只读。</td></tr></tbody></table>

代码示例：

```
def onRequest(context, request):
  # 打印请求方法，例如：POST
  print(request.method)
  # 打印请求路径，例如：/foo
  print(request.path)
  # 打印请求参数列表，例如：[('foo', 'bar'), ('hello', 'world')]
  print(request.queries)
  # 打印请求头列表，例如：['host: reqable.com', 'content-length: 6', 'content-type: text/plain']
  print(request.headers)
  # 打印请求体，例如 {"foo":"bar"}
  print(request.body)

  # 修改请求方法
  request.method = 'GET'
  # 修改请求路径
  request.path = '/bar'

  # 修改请求参数，更多API请参考下文`HttpQueries`
  request.queries['foo'] = 'bar'
  # 直接赋值请求参数
  request.queries = 'foo=bar&hello=world&abc=123'
  request.queries = {
    'foo': 'bar',
    'hello': 'world',
    'abc': '123'
  }
  # 删除指定请求参数
  request.queries.remove('foo')

  # 修改请求头，更多API请参考下文`HttpHeaders`
  request.headers['content-type'] = 'application/json'
  # 直接赋值请求头
  request.headers = [
    'content-type: application/json',
    'foo: bar'
  ]
  # 删除指定请求头
  request.headers.remove('foo')

  # 将文本设置给Body
  request.body = 'Hello World'
  # 将字典设置给Body，会自动转成JSON
  request.body = {
    'foo': 'bar',
    'abc': 123
  }
  # 将二进制数据设置给Body
  request.body = b'\x01\x02\x03\x04'
  # 将本地文件设置给Body
  request.body.file('/User/Reqable/Desktop/test.png')

  # JSON类型的Body转成字典
  request.body.jsonify()
  # 然后操作字典来修改Body
  request.body['foo'] = 'bar'
  request.body['error'] = {
    'code': 1000,
    'message': 'Runtime Error'
  }

  # Done
  return request
```

HttpResponse[​](#api-response "HttpResponse的直接链接")
--------------------------------------------------

<table><thead><tr><th>变量</th><th>类型</th><th>说明</th></tr></thead><tbody><tr><td><em>request</em></td><td><a href="#api-request">HttpRequest</a></td><td>响应的请求信息，只读。</td></tr><tr><td><strong>code</strong></td><td>int</td><td>响应状态码。</td></tr><tr><td><em>message</em></td><td>str</td><td>响应状态信息，只读。注意：HTTP2 协议中，值为空；此值在状态码修改后会自动更新。</td></tr><tr><td><em>protocol</em></td><td>str</td><td>响应的 HTTP 协议版本，只读。</td></tr><tr><td><strong>headers</strong></td><td><a href="#api-headers">HttpHeaders</a></td><td>响应头列表。</td></tr><tr><td><strong>body</strong></td><td><a href="#api-body">HttpBody</a></td><td>响应体。</td></tr><tr><td><strong>trailers</strong></td><td><a href="#api-headers">HttpHeaders</a></td><td>响应尾部列表，参见 HTTP1 的 chunked trailers 或者 HTTP2 的 trailers。注意此功能待验证，暂时请勿使用。</td></tr><tr><td><em>contentType</em></td><td>str 或 None</td><td>响应类型（即 headers 中的 Content-Type 的值），只读。</td></tr><tr><td><em>mime</em></td><td>str 或 None</td><td>响应 MIME 类型，例如 application/json，只读。</td></tr></tbody></table>

代码示例：

```
def onResponse(context, response):
  # 打印请求信息，更多API请参考上文`HttpRequest`
  print(response.request)
  # 打印响应状态码，例如：200
  print(response.code)
  # 打印响应消息
  print(response.message)
  # 打印响应头列表，例如：['server: Netlify', 'content-length: 6', 'content-type: text/plain']
  print(response.headers)
  # 打印响应体，例如 {"foo":"bar"}
  print(response.body)

  # 修改响应状态码
  response.code = 400

  # 更多的示例参考上面的`onRequest`，完全一样。

  # Done
  return response
```

HttpQueries[​](#api-queries "HttpQueries的直接链接")
-----------------------------------------------

<table><thead><tr><th>函数</th><th>参数</th><th>返回</th><th>说明</th></tr></thead><tbody><tr><td>len</td><td></td><td>int</td><td>返回 query 参数的个数。</td></tr><tr><td>iter</td><td></td><td></td><td>支持迭代遍历全部的 query 参数。</td></tr><tr><td>add</td><td>str, str</td><td></td><td>新增一个 query，参数为 name 和 value。</td></tr><tr><td>remove</td><td>str</td><td></td><td>删除指定 name 的 query。注意：如果有多个同名的，全部会移除。</td></tr><tr><td>clear</td><td></td><td></td><td>清空所有 query。</td></tr><tr><td>concat</td><td>bool</td><td>str</td><td>返回拼接好的完整 query 字符串。</td></tr><tr><td>index</td><td>str</td><td>int</td><td>查询指定 name 的 query 参数在列表中的索引，只返回第一个匹配 name 的索引。</td></tr><tr><td>indexes</td><td>str</td><td>list</td><td>查询指定 name 的 query 参数在列表中的索引，返回全部匹配 name 的索引列表。</td></tr><tr><td><strong>getitem</strong></td><td>str</td><td>str</td><td>获取指定 name 的 query 值。注意：如果有多个同名的，会返回第一个；如果不存在，则返回 None。</td></tr><tr><td><strong>getitem</strong></td><td>int</td><td>tuple</td><td>按照索引获取 query 的名称和值。</td></tr><tr><td><strong>setitem</strong></td><td>str, str</td><td></td><td>更新或新增 query。如果存在指定 name 的 query，则更新它的值，否则添加一个新的 query 参数。</td></tr></tbody></table>

代码示例：

```
def onRequest(context, request):
  # 打印query参数个数
  print(len(request.queries))
  # 遍历query参数
  for query in request.queries:
    print(query)

  # 新增query参数
  request.queries.add('foo', 'bar')
  # 移除query参数
  request.queries.remove('foo')
  # 清空全部query参数
  request.queries.clear()
  # 更新query参数，如果不存在则自动新增
  request.queries['foo'] = 'bar'

  # 打印指定query参数值，例如bar
  print(request.queries['foo'])
  # 打印指定索引位置的query名称和值，例如(foo, bar)
  print(request.queries[0])
  # 打印拼接好的完整Query字符串，例如foo=bar&hello=world
  print(request.queries.concat())
  # 打印拼接好的完整Query字符串（urlencode参数值）
  print(request.queries.concat(encode=True))

  # Done
  return request
```

<table><thead><tr><th>函数</th><th>参数</th><th>返回</th><th>说明</th></tr></thead><tbody><tr><td>len</td><td></td><td>int</td><td>返回 header 的个数。</td></tr><tr><td>iter</td><td></td><td></td><td>支持迭代遍历全部的 header。</td></tr><tr><td>add</td><td>str, str</td><td></td><td>新增一个 header，参数为 name 和 value。</td></tr><tr><td>remove</td><td>str</td><td></td><td>删除指定 name 的 header。注意：如果有多个同名的，全部会移除。</td></tr><tr><td>clear</td><td></td><td></td><td>清空所有 header。</td></tr><tr><td>index</td><td>str</td><td>int</td><td>查询指定 name 的 header 参数在列表中的索引，只返回第一个匹配 name 的索引。</td></tr><tr><td>indexes</td><td>str</td><td>list</td><td>查询指定 name 的 header 参数在列表中的索引，返回全部匹配 name 的索引列表。</td></tr><tr><td><strong>getitem</strong></td><td>str</td><td>str</td><td>获取指定 name 的 header 值。注意：如果有多个同名的，会返回第一个；如果不存在，则返回 None。</td></tr><tr><td><strong>getitem</strong></td><td>int</td><td>str</td><td>按照索引获取 header 的名称和值。</td></tr><tr><td><strong>setitem</strong></td><td>str, str</td><td></td><td>更新或新增 header。如果存在指定 name 的 header，则更新它的值，否则添加一个新的 header。</td></tr></tbody></table>

代码示例：

```
def onRequest(context, request):
  # 打印headers参数个数
  print(len(request.headers))
  # 遍历header
  for header in request.headers:
    print(header)
  # 新增header
  request.headers.add('foo', 'bar')
  # 移除header
  request.headers.remove('foo')
  # 清空全部header
  request.headers.clear()
  # 更新header，如果不存在则自动新增
  request.headers['foo'] = 'bar'
  # 打印指定header值，例如bar
  print(request.headers['foo'])
  # 打印指定索引位置的header名称和值，例如`foo: bar`
  print(request.headers[0])
  # Done
  return request
```

HttpBody[​](#api-body "HttpBody的直接链接")
--------------------------------------

<table><thead><tr><th>变量</th><th>类型</th><th>说明</th></tr></thead><tbody><tr><td><em>isNone</em></td><td>bool</td><td>判断是否是空 Body。此类型时，payload 为 None。</td></tr><tr><td><em>isText</em></td><td>bool</td><td>判断是否是字符串 Body。此类型时，payload 为 str。</td></tr><tr><td><em>isBinary</em></td><td>bool</td><td>判断是否是二进制 Body。此类型时，payload 为 bytes。</td></tr><tr><td><em>isMultipart</em></td><td>bool</td><td>判断是否是 Form Body。此类型时，payload 为 <a href="#api-multipart-body">HttpMultipartBody</a> 的列表。</td></tr><tr><td><em>type</em></td><td>int</td><td>返回 Body 的类型。0 表示空，1 表示字符串，2 表示二进制，3 表示 Form。</td></tr><tr><td><em>payload</em></td><td>多态类型，参照上方说明。</td><td>Body 的数据。</td></tr></tbody></table>

```
def onRequest(context, request):
  # 判断body类型
  print(request.body.type)
  if request.body.isNone:
    print('Http body is none')
  elif request.body.isText:
    print('Http body is text')
  elif request.body.isBinary:
    print('Http body is binary')
  elif request.body.isMultipart:
    print('Http body is multipart')

  # 打印Body的类型
  print(request.body.type)
  # 打印Body的数据
  print(request.body.payload)
```

<table><thead><tr><th>函数</th><th>参数</th><th>返回</th><th>说明</th></tr></thead><tbody><tr><td>none</td><td></td><td></td><td>设置为空 Body。</td></tr><tr><td>text</td><td>str</td><td></td><td>设置为字符串 Body，内容为参数值。</td></tr><tr><td>textFromFile</td><td>str</td><td></td><td>设置为字符串 Body，并从指定文件路径中读取字符串数据。</td></tr><tr><td>binary</td><td>str 或 bytes</td><td></td><td>设置为字节 Body，参数为 str 时表示从指定文件路径中读取数据。</td></tr><tr><td>file</td><td>str</td><td></td><td>设置为字节 Body，表示从指定文件路径中读取数据，功能同上面的 binary 函数。</td></tr><tr><td>multiparts</td><td>list</td><td></td><td>设置为 Multipart Body，参数为 <a href="#api-multipart-body">HttpMultipartBody</a> 的列表。</td></tr><tr><td>writeFile</td><td>str</td><td></td><td>将 Body 数据写入文件。注意：不支持 Multipart 类型 Body。</td></tr></tbody></table>

代码示例：

```
def onRequest(context, request):
  # 修改body为空
  request.body.none()
  # 修改body为字符串
  request.body.text('foobar')
  # 修改body为字符串，内容从文件读取
  request.body.textFromFile('/User/Reqable/Desktop/body.json')
  # 修改body为字节序列，直接指定
  request.body.binary(b'\x01\x02\x03\x04')
  # 修改body为字节序列，内容从文件读取
  request.body.binary('~/Desktop/body.json')
  # 修改body为multipart类型
  request.body.multiparts([
    HttpMultipartBody.text('Hi World'),
    HttpMultipartBody.file('data/body_binary.bin')
  ])

  # 将body数据写入文件
  request.body.writeFile('/User/Reqable/Desktop/body.json')

  # Done
  return request
```

#### HttpMultipartBody[​](#api-multipart-body "HttpMultipartBody的直接链接")

HttpMultipartBody 继承于 [HttpBody](#api-body)，额外多出一个 headers 属性。

<table><thead><tr><th>变量</th><th>类型</th><th>说明</th></tr></thead><tbody><tr><td><strong>headers</strong></td><td><a href="#api-headers">HttpHeaders</a></td><td>分部头部。</td></tr><tr><td><strong>name</strong></td><td>str</td><td>分部名称。</td></tr><tr><td><strong>filename</strong></td><td>str</td><td>分部文件名。</td></tr></tbody></table>

代码示例：

```
def onRequest(context, request):
  # 遍历parts
  for part in request.body:
    print(f'name {part.name}')
    print(f'filename {part.filename}')
    print(f'value {part}')

  # 修改parts
  request.body[0] = HttpMultipartBody.text('Hi World')
  request.body[0] = HttpMultipartBody.text('Hi World', name='reqable')
  request.body[0] = HttpMultipartBody.file('data/body_binary.bin')
  request.body[0] = HttpMultipartBody.file('data/body_binary.bin', name='reqable', filename='test.png')

  # Done
  return request
```

警告

如果将非 multipart 类型修改成 multipart 类型，必须同时修改 headers 设置 boundary！

App[​](#api-app "App的直接链接")
---------------------------

<table><thead><tr><th>变量</th><th>类型</th><th>说明</th></tr></thead><tbody><tr><td><em>name</em></td><td>str</td><td>应用（进程）名称。</td></tr><tr><td><em>id</em></td><td>str</td><td>应用 ID，未获取到为 None。例如 Android 上是<code>packageName</code>，Mac 上是<code>bundleId</code>。</td></tr><tr><td><em>path</em></td><td>str</td><td>应用执行文件路径，未获取到为 None。</td></tr></tbody></table>

代码示例：

```
def onRequest(context, response):
  # 打印应用信息
  print(context.app.name)
  print(context.app.id)
  print(context.app.path)
  # Done
  return request
```

Highlight[​](#api-highlight "Highlight的直接链接")
---------------------------------------------

<table><thead><tr><th>枚举</th><th>说明</th></tr></thead><tbody><tr><td><em>none</em></td><td>不高亮。</td></tr><tr><td><em>red</em></td><td>红色高亮。</td></tr><tr><td><em>yellow</em></td><td>黄色高亮。</td></tr><tr><td><em>green</em></td><td>绿色高亮。</td></tr><tr><td><em>blue</em></td><td>蓝色高亮。</td></tr><tr><td><em>teal</em></td><td>靛青色高亮。</td></tr><tr><td><em>strikethrough</em></td><td>中划线。</td></tr></tbody></table>

代码示例：

```
def onRequest(context, response):
  # 设置请求红色高亮
  context.highlight = Highlight.red
  # Done
  return request
```

示例 1[​](#示例1 "示例1的直接链接")
------------------------

下面是一个修改 JSON 响应数据的示例。

假设响应数据是下面的格式：

```
{
  "code": 10000,
  "message": "ok",
  "content": {
    "version": "1.0.0",
    "platform": "windows"
  }
}
```

我们需要将`version`的值修改为`2.0.0`。

```
from reqable import *

def onRequest(context, request):
  # Done
  return request

def onResponse(context, response):
  # 将响应体字典化
  response.body.jsonify()
  # 修改字典中的version值
  response.body['content']['version'] = '2.0.0'
  # Done
  return response
```

示例 2[​](#示例2 "示例2的直接链接")
------------------------

下面是一个自动给请求参数进行 MD5 签名的示例。

```
from reqable import *
import hashlib

def onRequest(context, request):
  # 对query列表进行排序
  request.queries = sorted(request.queries)
  # 拼接query数据
  text = request.queries.concat()
  # 选用md5算法进行签名
  algorithm = hashlib.md5()
  # 计算字符串的签名
  algorithm.update(text.encode(encoding='UTF-8'))
  signature = algorithm.hexdigest()
  # 签名加到请求头中
  request.headers['signature'] = signature
  # Done
  return request

def onResponse(context, response):
  # Done
  return response
```

示例 3[​](#示例3 "示例3的直接链接")
------------------------

下面是一个自动保存图片的脚本示例。

```
from reqable import *
from mimetypes import guess_extension
import datetime
import os

def onRequest(context, request):
  return request

def onResponse(context, response):
  # 检查Mime类型，非图片类型则跳过不处理
  mime = response.mime
  if mime == None:
    return response

  maintype, subtype = mime.split('/')
  if not maintype == 'image':
    return response

  # 保存图片到指定目录，文件名为时间戳，后缀根据Mime类型推导
  dir = '/Users/megatronking/Downloads/reqable/'
  os.makedirs(dir, exist_ok=True)
  name = datetime.datetime.now().strftime("%H%M%S%f")
  ext = guess_extension(mime)
  image = os.path.join(dir, name + ext)

  # 响应体写入文件
  print(f'Saving image {image}')
  response.body.writeFile(image)

  # Done
  return response
```