package com.gu.sfapiusercredentialsetter

import com.amazonaws.auth.profile.ProfileCredentialsProvider
import com.amazonaws.services.secretsmanager.AWSSecretsManagerClientBuilder
import com.amazonaws.services.secretsmanager.model.{CreateSecretRequest, Filter, ListSecretsRequest, UpdateSecretRequest}
import com.typesafe.scalalogging.LazyLogging
import io.circe._
import io.circe.generic.auto._
import io.circe.parser._
import io.circe.syntax._
import scalaj.http._

import scala.util.{Random, Try}

object Main extends App with LazyLogging {
  case class SfAuthDetails(access_token: String, instance_url: String)
  case class setPasswordResponse(message: String, errorCode: String)
  case class setPasswordRequestBody(NewPassword: String)
  case class SfGetAwsApiUsersResponse(
    done: Boolean,
    records: Seq[UserRecords.Records],
    nextRecordsUrl: Option[String] = None
  )
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

  val secretsManagerClient =
    AWSSecretsManagerClientBuilder
      .standard()
      .withCredentials(credential)
      .withRegion("eu-west-1")
      .build()

  setApiUserPasswordInSfAndSyncToAwsSecret()

  def setApiUserPasswordInSfAndSyncToAwsSecret(): Unit = {
    (for {

      config <- optConfig.toRight(new RuntimeException("Missing config value"))
      sfAuthDetails <- decode[SfAuthDetails](auth(config.salesforceConfig))
      awsApiUsersInSf <- getAwsApiUsersInSf(sfAuthDetails)

      activations = awsApiUsersInSf.records.map { awsApiUser =>
        val newPassword = generatePassword()
        updatePassword(sfAuthDetails, awsApiUser, newPassword)
        setPasswordInSecretsManager(awsApiUser, newPassword)
      }

    } yield {}).left
      .foreach(e => throw new RuntimeException("An error occurred: ", e))

  }

  def getSecretName(awsApiUserCommunityNickname: String, environment: String): String = {
    awsApiUserCommunityNickname + "-" + environment
  }

  def setPasswordInSecretsManager(awsApiUser: UserRecords.Records, newPassword: String): Unit = {
    logger.info(s"Setting password for user ${awsApiUser.Username} in Secrets Manager...")

    val secretName = getSecretName(awsApiUser.CommunityNickname, "DEV")

    if (secretExists(secretName)) {
      updateSecret(secretName, newPassword)
    } else {
      createSecret(awsApiUser, secretName, newPassword)
    }

  }

  //As of 22/10/2020, Password Policy in Sf is (minimum 8 chars, must include alpha and numeric chars)
  def generatePassword(): String = {
    logger.info("Generating password for api user")
    val newRandomAlphaString = randomStringFromCharList(6, ('a' to 'z') ++ ('A' to 'Z'))

    val newRandomNumericString = randomStringFromCharList(2, ('0' to '9'))

    val newPassword = Random.shuffle((newRandomAlphaString + newRandomNumericString).toList).mkString("")

    newPassword
  }

  def updatePassword(sfAuthDetails: SfAuthDetails, awsApiUserInSf: UserRecords.Records, newPassword: String): Unit = {
    logger.info(s"Setting password for user ${awsApiUserInSf.Username} in Salesforce...")

    val sfUpdateResponse = setSfPasswordPostRequest(sfAuthDetails, newPassword, awsApiUserInSf.Id)
    val setPasswordResponseJson = sfUpdateResponse.getOrElse("")
      .replace("[", "")
      .replace("]", "")

    decode[setPasswordResponse](setPasswordResponseJson)
  }

  def getAwsApiUsersInSf(sfAuthDetails: SfAuthDetails): Either[Error, SfGetAwsApiUsersResponse] = {
    logger.info("Getting Aws Api users from Salesforce...")

    val query = "Select Id, name, email, username, CommunityNickname from user where profile.name='Touchpoint API User' order by name"
    decode[SfGetAwsApiUsersResponse](doSfGetWithQuery(sfAuthDetails, query))
  }

  def doSfGetWithQuery(sfAuthDetails: SfAuthDetails, query: String): String = {
    Http(s"${sfAuthDetails.instance_url}/services/data/v20.0/query/")
      .param("q", query)
      .option(HttpOptions.readTimeout(30000))
      .header("Authorization", s"Bearer ${sfAuthDetails.access_token}")
      .method("GET")
      .asString
      .body
  }

  def secretExists(secretName: String): Boolean = {
    val filter: Filter = new Filter().withKey("name").withValues(secretName)
    val listSecrets = secretsManagerClient.listSecrets(new ListSecretsRequest().withFilters(filter))
    !listSecrets.getSecretList().isEmpty
  }

  def createSecret(awsApiUserInSf: UserRecords.Records, secretName: String, newPwd: String): Unit = {
    secretsManagerClient.createSecret(
      new CreateSecretRequest()
        .withName(secretName)
        .withSecretString(s"""{"username":"${awsApiUserInSf.Username}","password":"$newPwd","token":""}""")
    )
  }

  def updateSecret(secretName: String, newPwd: String): Unit = {
    println(s"setting secret in $secretName to : $newPwd")
    secretsManagerClient.updateSecret(
      new UpdateSecretRequest()
        .withSecretId(secretName)
        .withSecretString(s"""{"password":"$newPwd","token":""}""")
    )
  }

  def setSfPasswordPostRequest(
    sfAuthDetails: SfAuthDetails,
    newPwd: String,
    sfUserId: String
  ): Either[Throwable, String] = {
    val newPassword = setPasswordRequestBody(NewPassword = newPwd).asJson.spaces2
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

  def randomStringFromCharList(length: Int, chars: Seq[Char]): String = {
    val sb = new StringBuilder
    for (i <- 1 to length) {
      val randomNum = util.Random.nextInt(chars.length)
      sb.append(chars(randomNum))
    }
    sb.toString
  }

  //main method for lambda
  def handler(): Unit = {
    setApiUserPasswordInSfAndSyncToAwsSecret()
  }
}
