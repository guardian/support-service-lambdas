package com.gu.createAndUpdateSecret
import java.math.BigInteger
import java.security.SecureRandom

import com.amazonaws.auth.profile.ProfileCredentialsProvider
import com.amazonaws.regions.{Region, Regions}
import com.amazonaws.services.s3.AmazonS3Client
import com.amazonaws.services.s3.model.GetObjectRequest
import com.amazonaws.services.secretsmanager.AWSSecretsManagerClientBuilder
import com.amazonaws.services.secretsmanager.model.{
  CreateSecretRequest,
  UpdateSecretRequest
}
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.auto._
import io.circe.parser._
import io.circe.syntax._
import scalaj.http._

import scala.io.Source
import scala.util.Try

object Main extends App with LazyLogging {
  case class SfAuthDetails(access_token: String, instance_url: String)
  case class setPasswordResponse(message: String, errorCode: String)
  case class setPasswordBody(NewPassword: String)

  Region.getRegion(Regions.EU_WEST_2)
  private lazy val credential =
    new ProfileCredentialsProvider(
      "/Users/david_pepper/.aws/credentials",
      "developerPlayground"
    )

  lazy val optConfig = for {
    sfUserName <- Option(System.getenv("username"))
    sfClientId <- Option(System.getenv("clientId"))
    sfClientSecret <- Option(System.getenv("clientSecret"))
    sfPassword <- Option(System.getenv("password"))
    sfToken <- Option(System.getenv("token"))
    sfAuthUrl <- Option(System.getenv("authUrl"))

  } yield Config(
    SalesforceConfig(
      userName = sfUserName,
      clientId = sfClientId,
      clientSecret = sfClientSecret,
      password = sfPassword,
      token = sfToken,
      authUrl = sfAuthUrl
    )
  )
  private val random = SecureRandom.getInstanceStrong

  def alphanumeric(nrChars: Int = 24): String = {
    new BigInteger(nrChars * 5, random).toString(32)
  }
  val secretsManagerClient =
    AWSSecretsManagerClientBuilder
      .standard()
      .withCredentials(credential)
      .withRegion("eu-west-1")
      .build()
  println("aws_sm_client: " + secretsManagerClient)

  //mainProcessor()
  getFileFromS3()

  def getFileFromS3(): Unit = {
    val s3Client = new AmazonS3Client(credential)
    val s3Object =
      s3Client.getObject(
        new GetObjectRequest("testing-secret-update", "s3ApiUsers.csv")
      )
    val myData = Source.fromInputStream(s3Object.getObjectContent())
    println("myData:" + myData)
    for (line <- myData.getLines) {
      val cols = line.split(",").map(_.trim)
      // do whatever you want with the columns here
      val sfUserId = cols(0)
      val sfUsername = cols(1)
      val emailAddress = cols(2)

      println("sfUserId:" + sfUserId)
      println("sfUsername:" + sfUsername)
      println("emailAddress:" + emailAddress)
      println("=============================================")
    }

    val runid = myData.getLines().mkString
    println("runId:" + runid)
  }
  def mainProcessor(): Unit = {

    val newPassword = randomLowerCaseAlphaString(5) + randomUpperCaseAlphaString(
      5
    ) + randomNumericString(5)
    println("newPassword: " + newPassword)

    val yyy = for {

      config <- optConfig.toRight(new RuntimeException("Missing config value"))
      sfAuthDetails <- decode[SfAuthDetails](auth(config.salesforceConfig))
      sfUpdateResponse <- doSfPostRequest(
        sfAuthDetails,
        newPassword,
        "0050J00000905ZN"
      )
      setPasswordResponeJson = sfUpdateResponse
        .replace("[", "")
        .replace("]", "")
      decodedSetPasswordResponse = decode[setPasswordResponse](
        setPasswordResponeJson
      )
    } yield {
      println("decodedSetPasswordResponse: " + decodedSetPasswordResponse)

      decodedSetPasswordResponse match {
        case Right(response) => {
          println("Problem updating password:" + response.message)
        }

        case Left(ex) => {
          println("password successfully updated")
          updateSecret("testsecret", newPassword)
        }
      }
    }

  }

  def updateSecret(secretName: String, newPwd: String): Unit = {
    val z = secretsManagerClient.updateSecret(
      new UpdateSecretRequest()
        .withSecretId(secretName)
        .withSecretString(s"""{"username":"bob","password":"$newPwd"}""")
    )

    println(z)
  }

  def doSfPostRequest(
    sfAuthDetails: SfAuthDetails,
    newPwd: String,
    sfUserId: String
  ): Either[Throwable, String] = {
    println("doSfPostRequest")
    println("sfAuthDetails: " + sfAuthDetails)

    val newPassword = setPasswordBody(NewPassword = newPwd).asJson.spaces2
    println("newPassword:" + newPassword)
    Try {
      Http(
        s"${sfAuthDetails.instance_url}/services/data/v25.0/sobjects/User/$sfUserId/password"
      ).option(HttpOptions.readTimeout(30000))
        .header("Authorization", s"Bearer ${sfAuthDetails.access_token}")
        .header("Content-Type", "application/json")
        .postData(newPassword)
        .asString
        .body
    }.toEither
  }

  def createSecret(secretName: String = "testsecret"): Unit = {
    val y = secretsManagerClient.createSecret(
      new CreateSecretRequest()
        .withName(secretName)
        .withSecretString("""{"username":"bob","password":"abc123xyz456"}""")
    )
    println("key created: " + y)
  }

  def auth(salesforceConfig: SalesforceConfig): String = {
    logger.info("Authenticating with Salesforce...")
    Http(s"${System.getenv("authUrl")}/services/oauth2/token")
      .postForm(
        Seq(
          "grant_type" -> "password",
          "client_id" -> salesforceConfig.clientId,
          "client_secret" -> salesforceConfig.clientSecret,
          "username" -> salesforceConfig.userName,
          "password" -> s"${salesforceConfig.password}${salesforceConfig.token}"
        )
      )
      .asString
      .body
  }

  def randomLowerCaseAlphaString(len: Int): String = {
    val rand = new scala.util.Random(System.nanoTime)
    val sb = new StringBuilder(len)
    val ab = "abcdefghijklmnopqrstuvwxyz"
    for (i <- 0 until len) {
      sb.append(ab(rand.nextInt(ab.length)))
    }
    sb.toString
  }

  def randomUpperCaseAlphaString(len: Int): String = {
    val rand = new scala.util.Random(System.nanoTime)
    val sb = new StringBuilder(len)
    val ab = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    for (i <- 0 until len) {
      sb.append(ab(rand.nextInt(ab.length)))
    }
    sb.toString
  }

  def randomNumericString(len: Int): String = {
    val rand = new scala.util.Random(System.nanoTime)
    val sb = new StringBuilder(len)
    val ab = "0123456789"
    for (i <- 0 until len) {
      sb.append(ab(rand.nextInt(ab.length)))
    }
    sb.toString
  }
}
