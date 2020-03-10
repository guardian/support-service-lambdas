package com.gu.sf.move.subscriptions.api


import cats.effect.IO
import com.gu.DevIdentity
import io.circe.generic.auto._
import io.circe.syntax._
import org.http4s.{Method, Request, Uri}
import org.scalatest.{FlatSpec, Matchers}


class SFMoveSubscriptionsApiTest extends FlatSpec with Matchers {

  private val api = createApp()

  it should "test" in {

    val response = api.run(
      Request[IO](
        method = Method.POST,
        uri = Uri(path = "/subscription/move")
      ).withEntity[String](
        MoveSubscriptionData(
          zuoraSubscriptionId = "A-1111",
          sfAccountId = "2222",
          sfFullContactId = "3333",
        ).asJson.spaces2)
    ).value.unsafeRunSync().get

    println(response)

    1 shouldEqual 1
  }

  private def createApp() = {
    SFMoveSubscriptionsApiApp(DevIdentity("sf-move-subscriptions-api")).value.unsafeRunSync()
      .right.get
  }

}
