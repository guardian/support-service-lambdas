package com.gu.paperround.client

import com.gu.effects.{GetFromS3, Http, RawEffects}
import com.gu.test.EffectsTest
import com.gu.util.config.LoadConfigModule
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class PaperRoundClientTest extends AnyFlatSpec with Matchers {

  val client = for {
    config <- LoadConfigModule(RawEffects.stage, GetFromS3.fetchString).load[PaperRoundConfig]
  } yield PaperRoundRestRequestMaker(Http.response, config)

  "paperround client" should "get coverage successfully in sandbox" taggedAs EffectsTest in {
    val actual = for {
      client <- client
      coverage <- GetAgents(client).getAgents().toDisjunction
    } yield coverage
    println("actual: " + actual)
  }

  it should "get all agents successfully in sandbox" taggedAs EffectsTest in {
    val actual = for {
      client <- client
      coverage <- GetAgents(client).getAgents().toDisjunction
    } yield coverage
    println("actual: " + actual)
  }

}
