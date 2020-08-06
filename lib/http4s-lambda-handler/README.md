# Http4s Aws Lambda Handler

This a wrapper/implementation for http4s server that allow you to use http4s 
to handle api gateway that have been routed to a lambda.

For details see:
- [https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway.html](https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway.html)
- [https://http4s.org/v0.21/dsl/](https://http4s.org/v0.21/dsl/)

This is a replacement for the scala-server-lambda project which fell into inactivity:

[https://github.com/howardjohn/scala-server-lambda](https://github.com/howardjohn/scala-server-lambda)

## Usage

Create a handler object the inherits from the Http4sLambdaHandler class and pass it the 
http4s routes

```scala
package com.gu.lambdatest

import cats.effect.IO
import org.http4s.dsl.impl.Root
import org.http4s._, org.http4s.dsl.io._
import com.gu.http4s.Http4sLambdaHandler

object Handler extends Http4sLambdaHandler(
  HttpRoutes.of[IO]  {
    case GET -> Root / "hello" => Ok("hello world!")
  }
)
```

Ensure your lambda is configured to call the 'handle' function on your handler class

```yaml
    Http4sLambda:
        Type: AWS::Lambda::Function
        Properties:
            ...
            Handler: com.gu.lambdatest.Handler::handle
            ...
```