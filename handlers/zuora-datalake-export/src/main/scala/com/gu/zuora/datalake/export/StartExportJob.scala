package com.gu.zuora.datalake.export

import io.circe.generic.auto._
import io.circe.parser._
import io.github.mkotsur.aws.handler.Lambda._
import io.github.mkotsur.aws.handler.Lambda
import com.amazonaws.services.lambda.runtime.Context
import com.amazonaws.services.s3.AmazonS3Client
import scalaj.http.Http

import scala.io.Source

case class Ping(inputMsg: String)
case class Pong(outputMsg: String)
case class Oauth(clientId: String, clientSecret: String)
case class ZuoraDatalakeExport(oauth: Oauth)
case class Config(stage: String, baseUrl: String, zuoraDatalakeExport: ZuoraDatalakeExport)
case class AccessToken(access_token: String)
case class QueryResponse(id: String)
case class Batch(fileId: String, batchId: String, status: String, name: String)
case class JobResults(status: String, id: String, batches: List[Batch])

class StartExportJob extends Lambda[Ping, Pong] {
  override def handle(ping: Ping, context: Context) = {
    println("hello world")

    val jobId = Query()
    println(s"jobId = ${jobId}")

    Thread.sleep(5000)

    val status = GetJobResult(jobId)
    println(status)

    val tmpBatch = status.batches.head
    val csvFile = GetResultsFile(tmpBatch.fileId)

    SaveCsvToBucket(csvFile, tmpBatch.name)

    Right(Pong(ping.inputMsg.reverse))
  }
}

object ReadConfig {
  def apply(): Config = {
    val s3Client = AmazonS3Client.builder.build()
    val bucketName = "gu-reader-revenue-private"
    val key = "membership/support-service-lambdas/CODE/zuoraRest-CODE.v1.json"
    val inputStream = s3Client.getObject(bucketName, key).getObjectContent
    val rawJson = Source.fromInputStream(inputStream).mkString
    decode[Config](rawJson) match {
      case Right(oauth) => oauth
      case Left(error) => throw new RuntimeException(s"Could not read secret config file from S3://$bucketName/$key", error)
    }
  }
}

object AccessToken {
  def apply(): String = {
    val config = ReadConfig()
    val oauthConfig = config.zuoraDatalakeExport.oauth
    val response = Http(s"https://rest.apisandbox.zuora.com/oauth/token")
      .postForm(Seq(
        "client_id" -> oauthConfig.clientId,
        "client_secret" -> oauthConfig.clientSecret,
        "grant_type" -> "client_credentials"
      ))
      .asString

    response.code match {
      case 200 => decode[AccessToken](response.body).getOrElse(throw new RuntimeException(s"Failed to decode oauth response: ${response}")).access_token
      case _ => throw new RuntimeException(s"Failed to generate oauth token: ${response}")
    }
  }
}

/**
 * https://knowledgecenter.zuora.com/DC_Developers/AB_Aggregate_Query_API/BA_Stateless_and_Stateful_Modes#Automatic_Switch_Between_Full_Load_and_Incremental_Load
 */
object Query {
  def apply() = {
    val body =
      """
        |{
        |	"format" : "csv",
        |	"version" : "1.2",
        |	"name" : "zuora-datalake-export",
        |	"encrypted" : "none",
        |	"useQueryLabels" : "true",
        |	"dateTimeUtc" : "true",
        |	"partner": "guardian-12357",
        |	"project": "zuora-datalake-export",
        |	"incrementalTime": "2019-02-20 00:00:00",
        |	"queries" : [
        |		{
        |			"name" : "Account",
        |			"query" : "SELECT Account.Balance,Account.AutoPay,Account.Currency,Account.ID,Account.IdentityId__c,Account.LastInvoiceDate,Account.sfContactId__c,Account.MRR FROM Account WHERE Status != 'Canceled' AND (ProcessingAdvice__c != 'DoNotProcess' OR ProcessingAdvice__c IS NULL)",
        |			"type" : "zoqlexport",
        |			"deleted" : {
        |                 "column" : "IsDeleted",
        |                 "format"  : "Boolean"
        |            }
        |		}
        |	]
        |}
      """.stripMargin

    val response = Http(s"https://rest.apisandbox.zuora.com/v1/batch-query/")
      .header("Authorization", s"Bearer ${AccessToken()}")
      .header("Content-Type", "application/json")
      .postData(body)
      .method("POST")
      .asString

    response.code match {
      case 200 => decode[QueryResponse](response.body).getOrElse(throw new RuntimeException(s"Failed to parse Query response: ${response}")).id
      case _ => throw new RuntimeException(s"Failed to start AQuA job: ${response}")
    }

  }
}
/**
 * https://knowledgecenter.zuora.com/DC_Developers/AB_Aggregate_Query_API/C_Get_Job_ID
 */
object GetJobResult {
  def apply(jobId: String) = {
    val response = Http(s"https://rest.apisandbox.zuora.com/v1/batch-query/jobs/$jobId")
      .header("Authorization", s"Bearer ${AccessToken()}")
      .header("Content-Type", "application/json")
      .asString

    response.code match {
      case 200 => decode[JobResults](response.body).getOrElse(throw new RuntimeException(s"Failed to parse GetJobResult response: ${response}"))
      case _ => throw new RuntimeException(s"Failed to execute request GetJobResult: ${response}")
    }

  }
}

/**
 * https://knowledgecenter.zuora.com/DC_Developers/AB_Aggregate_Query_API/D_Get_File_Download
 */
object GetResultsFile {
  def apply(fileId: String) = {
    val response = Http(s"https://rest.apisandbox.zuora.com/v1/file/${fileId}")
      .header("Authorization", s"Bearer ${AccessToken()}")
      .asString

    response.code match {
      case 200 => response.body
      case _ => throw new RuntimeException(s"Failed to execute request GetResultsFile: ${response}")
    }

  }
}

object SaveCsvToBucket {
  def apply(csvContent: String, fileName: String) = {
    val s3Client = AmazonS3Client.builder.build()
    // val bucketName = "zuora-datalake-export-code"
    // val key = s"$fileName.csv"
    val bucketName = "ophan-temp-schema"
    val key = s"marioTest/raw/zuora/increment/$fileName.csv"
    s3Client.putObject(bucketName, key, csvContent)
  }
}
