package com.gu.google

import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import play.api.libs.json.{JsObject, Json}

import java.security.KeyPairGenerator
import java.util.Base64

class ServiceAccountTest extends AnyFlatSpec with Matchers {

  val mockPrivateKey = {
    val kpg = KeyPairGenerator.getInstance("RSA")
    val pvt = kpg.genKeyPair().getPrivate
    Base64.getEncoder().encodeToString(pvt.getEncoded())
  }

  it should "parse credentials" in {
    val config = BigQueryConfig(Json.parse(
      s"""
        |  {
        |      "type": "service_account",
        |      "project_id": "my-project",
        |      "client_id": "09876543",
        |      "client_email": "service-account@my-project.iam.gserviceaccount.com",
        |      "private_key": "-----BEGIN PRIVATE KEY-----\\n$mockPrivateKey\\n-----END PRIVATE KEY-----\\n",
        |      "private_key_id": "12345678"
        |  }
        |""".stripMargin).as[JsObject])

    val googleCreds = ServiceAccount.credentialsFromConfig(config)
    googleCreds.getProjectId shouldBe "my-project"
    googleCreds.getClientId shouldBe "09876543"
    googleCreds.getClientEmail shouldBe "service-account@my-project.iam.gserviceaccount.com"
  }

}
