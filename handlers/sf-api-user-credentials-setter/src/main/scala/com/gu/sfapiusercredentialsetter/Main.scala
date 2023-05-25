package com.gu.sfapiusercredentialsetter

import com.typesafe.scalalogging.LazyLogging
import io.circe._
import io.circe.generic.auto._
import io.circe.parser._
import io.circe.syntax._
import scalaj.http._
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient
import software.amazon.awssdk.services.secretsmanager.model._

import scala.util.{Random, Try}

object Main extends App with LazyLogging {

  val salesforceApiVersion = "54.0"

  case class SfAuthDetails(access_token: String, instance_url: String)

  case class setPasswordResponse(message: String, errorCode: String)

  case class setPasswordRequestBody(NewPassword: String)

  case class SfGetAwsApiUsersResponse(
      done: Boolean,
      records: Seq[Records],
      nextRecordsUrl: Option[String] = None,
  )

  case class Records(
      Id: String,
      Username: String,
      CommunityNickname: String,
  )

  lazy val optConfig = for {
    secrets <- Secrets.getAwsCredentialsSetterSecrets
  } yield Config(
    SalesforceConfig(
      userName = secrets.username,
      clientId = secrets.clientId,
      clientSecret = secrets.clientSecret,
      password = secrets.password,
      token = secrets.token,
      authUrl = secrets.authUrl,
    ),
    AwsConfig(
      stageName = secrets.stageName,
    ),
  )

  def setApiUserPasswordInSfAndSyncToAwsSecret(secretsManagerClient: SecretsManagerClient): Unit = {
    (for {
      config <- optConfig.toRight(new RuntimeException("Missing config value"))
      sfauth <- (auth(config.salesforceConfig) match {
        // Here I am converting an Option into an Either, the other option was to
        // have auth return an Option.
        case None => Left(new RuntimeException("Missing config value"))
        case Some(str) => Right(str)
      })
      sfAuthDetails <- decode[SfAuthDetails](sfauth)
      awsApiUsersInSf <- getAwsApiUsersInSf(sfAuthDetails)
      activations = awsApiUsersInSf.records.map { awsApiUser =>
        val newPassword = generatePassword()
        updatePassword(sfAuthDetails, awsApiUser, newPassword)
        setPasswordInSecretsManager(
          secretsManagerClient,
          awsApiUser,
          newPassword,
          config.awsConfig.stageName,
        )
      }
    } yield {}).left
      .foreach(e => throw new RuntimeException("An error occurred: ", e))
  }

  setApiUserPasswordInSfAndSyncToAwsSecret(SecretsManagerClient.create())

  // Convention: <stage>/<system>/User/<user>
  def getSecretName(
      awsApiUserCommunityNickname: String,
      stage: String,
  ): String = {
    s"$stage/Salesforce/User/$awsApiUserCommunityNickname"
  }

  def setPasswordInSecretsManager(
      secretsManagerClient: SecretsManagerClient,
      awsApiUser: Records,
      newPassword: String,
      stage: String,
  ): Unit = {
    logger.info(
      s"Setting password for user ${awsApiUser.Username} in Secrets Manager...",
    )

    val secretName = getSecretName(awsApiUser.CommunityNickname, stage)

    if (secretExists(secretsManagerClient, secretName)) {
      updateSecret(secretsManagerClient, awsApiUser, secretName, newPassword)
    } else {
      createSecret(secretsManagerClient, awsApiUser, secretName, newPassword)
    }

  }

  // As of 22/10/2020, Password Policy in Sf is (minimum 8 chars, must include alpha and numeric chars)
  def generatePassword(): String = {
    logger.info("Generating password for api user")
    val newRandomAlphaString =
      randomStringFromCharList(6, ('a' to 'z') ++ ('A' to 'Z'))

    val newRandomNumericString = randomStringFromCharList(2, ('0' to '9'))

    val newPassword = Random
      .shuffle((newRandomAlphaString + newRandomNumericString).toList)
      .mkString("")

    newPassword
  }

  def updatePassword(
      sfAuthDetails: SfAuthDetails,
      awsApiUserInSf: Records,
      newPassword: String,
  ): Unit = {
    logger.info(
      s"Setting password for user ${awsApiUserInSf.Username} in Salesforce...",
    )

    val sfUpdateResponse =
      setSfPasswordPostRequest(sfAuthDetails, newPassword, awsApiUserInSf.Id)

    val setPasswordResponseJson = sfUpdateResponse
      .getOrElse("")

    if (!setPasswordResponseJson.isEmpty) {
      val decodedResponse =
        decode[List[setPasswordResponse]](setPasswordResponseJson)
      logger.error(
        s"Error setting password for user ${awsApiUserInSf.Username} in Salesforce: $decodedResponse",
      )
    }
  }

  def getAwsApiUsersInSf(
      sfAuthDetails: SfAuthDetails,
  ): Either[Error, SfGetAwsApiUsersResponse] = {
    logger.info("Getting Aws Api users from Salesforce...")

    val query =
      "Select Id, name, email, username, CommunityNickname from user where profile.name='Touchpoint API User' and isActive=true order by name"

    decode[SfGetAwsApiUsersResponse](doSfGetWithQuery(sfAuthDetails, query))
  }

  def doSfGetWithQuery(sfAuthDetails: SfAuthDetails, query: String): String = {
    Http(s"${sfAuthDetails.instance_url}/services/data/v$salesforceApiVersion/query/")
      .param("q", query)
      .option(HttpOptions.readTimeout(30000))
      .header("Authorization", s"Bearer ${sfAuthDetails.access_token}")
      .method("GET")
      .asString
      .body
  }

  def secretExists(
      secretsManagerClient: SecretsManagerClient,
      secretName: String,
  ): Boolean = {
    val filter = Filter.builder.key("name").values(secretName).build()
    val listSecrets =
      secretsManagerClient.listSecrets(
        ListSecretsRequest.builder.filters(filter).build(),
      )
    listSecrets.hasSecretList
  }

  def createSecret(
      secretsManagerClient: SecretsManagerClient,
      awsApiUserInSf: Records,
      secretName: String,
      newPwd: String,
  ): Either[Throwable, CreateSecretResponse] = {
    Try(
      secretsManagerClient.createSecret(
        CreateSecretRequest.builder
          .name(secretName)
          .secretString(
            s"""{"username":"${awsApiUserInSf.Username}","password":"$newPwd","token":""}""",
          )
          .build(),
      ),
    ).toEither
  }

  def updateSecret(
      secretsManagerClient: SecretsManagerClient,
      awsApiUserInSf: Records,
      secretName: String,
      newPwd: String,
  ): Either[Throwable, UpdateSecretResponse] = {
    Try(
      secretsManagerClient.updateSecret(
        UpdateSecretRequest.builder
          .secretId(secretName)
          .secretString(
            s"""{"username":"${awsApiUserInSf.Username}","password":"$newPwd","token":""}""",
          )
          .build(),
      ),
    ).toEither
  }

  def setSfPasswordPostRequest(
      sfAuthDetails: SfAuthDetails,
      newPwd: String,
      sfUserId: String,
  ): Either[Throwable, String] = {
    val newPassword =
      setPasswordRequestBody(NewPassword = newPwd).asJson.spaces2
    Try {
      Http(
        s"${sfAuthDetails.instance_url}/services/data/v$salesforceApiVersion/sobjects/User/$sfUserId/password",
      ).option(HttpOptions.readTimeout(30000))
        .header("Authorization", s"Bearer ${sfAuthDetails.access_token}")
        .header("Content-Type", "application/json")
        .postData(newPassword)
        .asString
        .body
    }.toEither
  }

  def auth(salesforceConfig: SalesforceConfig): Option[String] = {
    for {
      secrets <- Secrets.getAwsCredentialsSetterSecrets
    } yield {
      logger.info("Authenticating with Salesforce...")
      Http(s"${secrets.authUrl}/services/oauth2/token")
        .postForm(
          Seq(
            "grant_type" -> "password",
            "client_id" -> salesforceConfig.clientId,
            "client_secret" -> salesforceConfig.clientSecret,
            "username" -> salesforceConfig.userName,
            "password" -> s"${salesforceConfig.password}${salesforceConfig.token}",
          ),
        )
        .asString
        .body
    }
  }

  def randomStringFromCharList(length: Int, chars: Seq[Char]): String = {
    (1 to length).foldLeft("") { (acc, _) =>
      val randomNum = util.Random.nextInt(chars.length)
      acc + chars(randomNum)
    }
  }

  // main method for lambda
  def handler(): Unit = {
    setApiUserPasswordInSfAndSyncToAwsSecret(SecretsManagerClient.create())
  }
}
