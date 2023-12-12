package com.gu.cleaner

import java.io.{ByteArrayInputStream, ByteArrayOutputStream, InputStream, OutputStream}
import java.time.LocalDate

import cats.syntax.all._
import com.amazonaws.services.lambda.runtime._
import com.gu.aws.AwsCloudWatch
import com.gu.aws.AwsCloudWatch._
import com.gu.cleaner.CancelAccount.CancelAccountRequest
import com.gu.cleaner.RemoveAccountCrm.RemoveAccountCrmRequest
import com.gu.cleaner.CancelSub._
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.resthttp.RestRequestMaker
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientFailure, ClientSuccess}
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}
import com.gu.zuora.reports._
import com.gu.zuora.reports.aqua.{AquaJobResponse, AquaQuery, AquaQueryRequest, ZuoraAquaRequestMaker}
import com.gu.zuora.reports.dataModel.Batch
import play.api.libs.json.{JsSuccess, Json, Reads}

import scala.annotation.tailrec
import scala.io.Source

object Handler extends RequestStreamHandler {

  def main(args: Array[String]): Unit = {
    println("main: STARTING!")
    // FOR TESTING
    handleRequest(
      new ByteArrayInputStream(Array[Byte]()),
      new ByteArrayOutputStream(),
      new Context {
        override def getAwsRequestId: String = ???

        override def getLogGroupName: String = ???

        override def getLogStreamName: String = ???

        override def getFunctionName: String = ???

        override def getFunctionVersion: String = ???

        override def getInvokedFunctionArn: String = ???

        override def getIdentity: CognitoIdentity = ???

        override def getClientContext: ClientContext = ???

        override def getRemainingTimeInMillis: Int = ???

        override def getMemoryLimitInMB: Int = ???

        override def getLogger: LambdaLogger = new LambdaLogger {
          override def log(message: String): Unit = println("LOG: " + message)

          override def log(message: Array[Byte]): Unit = ???
        }
      },
    )
    println("main: FINISHED!")
  }

  // referenced in cloudformation, change with care
  def handleRequest(
      input: InputStream,
      output: OutputStream,
      context: Context,
  ): Unit = {
    def log(message: String) = context.getLogger.log(message)

    log("starting lambda!")
    val stageForZuora = Stage("CODE") // always clean CODE, even in PROD
    val loadConfig = LoadConfigModule(stageForZuora, GetFromS3.fetchString)
    val response = RawEffects.response
    val downloadResponse = RawEffects.downloadResponse
    val stage = RawEffects.stage
    val maybeSuccess = for {
      zuoraRestConfig <- loadConfig.load[ZuoraRestConfig]
      requests = ZuoraRestRequestMaker(response, zuoraRestConfig)
      cancelSub = CancelSub(log, requests)
      cancelAccount = CancelAccount(log, requests)
      removeAccountCrm = RemoveAccountCrm(log, requests)
      downloadRequests = ZuoraAquaRequestMaker(downloadResponse, zuoraRestConfig)
      aquaQuerier = Querier.lowLevel(downloadRequests) _
      getJobResult = GetJobResult(downloadRequests.get[AquaJobResponse]) _
      _ <- new Steps(log).steps(
        aquaQuerier,
        getJobResult,
        downloadRequests,
        cancelSub,
        cancelAccount,
        removeAccountCrm,
        () => RawEffects.now().toLocalDate,
      )
    } yield ()
    val _ = maybeSuccess.toTry.get // throws exception if something failed
    log("finished successfully - sending metric!")
    putMetric(stage)
  }

  /*
  Namespace: support-service-lambdas
              MetricName: cleanup-succeeded
              Dimensions:
                - Name: Stage
                  Value: !Ref Stage
                - Name: app
                  Value: dev-env-cleaner
   */
  def putMetric(stage: Stage): Unit = {
    AwsCloudWatch.metricPut(
      MetricRequest(
        MetricNamespace("support-service-lambdas"),
        MetricName("cleanup-succeeded"),
        Map(
          MetricDimensionName("Stage") -> MetricDimensionValue(stage.value),
          MetricDimensionName("app") -> MetricDimensionValue("dev-env-cleaner"),
        ),
      ),
    )
  }

}
class Steps(log: String => Unit) {

  def steps(
      aquaQuerier: AquaQueryRequest => ClientFailableOp[String],
      getJobResult: JobResultRequest => ClientFailableOp[JobResult],
      downloadRequests: RestRequestMaker.Requests,
      cancelSub: CancelSub,
      cancelAccount: CancelAccount,
      removeAccountCrm: RemoveAccountCrm,
      today: () => LocalDate,
  ): Either[Throwable, Unit] = {
    val subs_to_cancel = "subs_to_cancel"
    val subsQuery = AquaQuery(
      subs_to_cancel,
      """select Id, TermEndDate
        |from Subscription
        |where (billtocontact.WorkEmail LIKE '%@thegulocal.com' OR (billtocontact.WorkEmail LIKE 'test%' AND billtocontact.WorkEmail LIKE '%@theguardian.com')) and Status = 'Active' and account.Status = 'Active'
        |""".stripMargin,
    )
    val accounts_to_cancel = "accounts_to_cancel"
    val accountsQuery = AquaQuery(
      accounts_to_cancel,
      """select Id, CreditBalance
        |from Account
        |where (billtocontact.WorkEmail LIKE '%@thegulocal.com' OR (billtocontact.WorkEmail LIKE 'test%' AND billtocontact.WorkEmail LIKE '%@theguardian.com')) and Status = 'Active'
        |""".stripMargin,
    )
    val request = AquaQueryRequest(
      name = "test_accounts_and_subs",
      queries = List(subsQuery, accountsQuery),
    )
    val zRes = for {
      jobId <- aquaQuerier(request)
      batches <- waitForResult(jobId, getJobResult)
      streams <- batches.toList.traverse { batch =>
        downloadRequests
          .getDownloadStream(s"batch-query/file/${batch.fileId}")
          .map(stream => (batch.name, stream.stream))
      }
      queryResults = streams.map { case (name, stream) =>
        val csvLines = Source.fromInputStream(stream).getLines()
        val values = csvLines.drop(1).map(_.split(',').toList) // first line is a header
        (name, values)
      }.toMap
      _ <- queryResults(subs_to_cancel)
        .map { case id :: termEndDate :: Nil => cancelSub.run(id, dateToCancel(LocalDate.parse(termEndDate), today())) }
        .toList
        .sequence
      _ <- queryResults(accounts_to_cancel).map { 
        case id :: creditBalance :: Nil => 
        creditBalance.toDouble match {
          case 0 => cancelAccount.run(id)
          case _ => removeAccountCrm.run(id) //can't cancel an account with a credit balance, so just remove the CRMId
        } 
      }.toList.sequence
    } yield ()
    zRes.toDisjunction.leftMap(failure =>
      new RuntimeException(s"one of the preceding requests has failed: ${failure.toString}"),
    )

  }

  def dateToCancel(termEndDate: LocalDate, today: LocalDate): LocalDate =
    if (termEndDate.isBefore(today))
      termEndDate
    else
      today

  @tailrec
  final def waitForResult(
      jobId: String,
      getJobResult: JobResultRequest => ClientFailableOp[JobResult],
  ): ClientFailableOp[Seq[Batch]] = {
    getJobResult(JobResultRequest(jobId, false, None)) match {
      case ClientSuccess(success) =>
        success match {
          case pending: Pending =>
            Thread.sleep(10000)
            log(s"still pending: $pending")
            waitForResult(jobId, getJobResult)
          case c: Completed =>
            ClientSuccess(c.batches)
        }
      case fail: ClientFailure => fail
    }
  }

}

/*

body='{
"cancellationEffectiveDate": "2020-08-25",
"cancellationPolicy": "SpecificDate",
"runBilling": false
}'
/subscriptions/$id/cancel
 */
object CancelSub {
  case class CancelRequest(
      cancellationEffectiveDate: LocalDate,
      cancellationPolicy: String = "SpecificDate",
  )
  implicit val writes = Json.writes[CancelRequest]

  implicit val unitReads: Reads[Unit] =
    Reads(_ => JsSuccess(()))

}
case class CancelSub(log: String => Unit, restRequestMaker: RestRequestMaker.Requests) {
  def run(subId: String, dateToCancel: LocalDate): ClientFailableOp[Unit] = {
    println(s"CANCEL SUB: $subId as of date $dateToCancel")
    restRequestMaker.put[CancelRequest, Unit](CancelRequest(dateToCancel), s"subscriptions/$subId/cancel")
  }

}

/*
body='{
"Status": "Canceled"
}'
object/account/$id
 */

object CancelAccount {
  case class CancelAccountRequest(
      Status: String = "Canceled",
  )
  implicit val writes = Json.writes[CancelAccountRequest]

}
case class CancelAccount(log: String => Unit, restRequestMaker: RestRequestMaker.Requests) {
  def run(accountId: String): ClientFailableOp[Unit] = {
    println(s"CANCEL ACC: $accountId")
    restRequestMaker.put[CancelAccountRequest, Unit](CancelAccountRequest(), s"object/account/$accountId")
  }

}

object RemoveAccountCrm {
  case class RemoveAccountCrmRequest(
      CrmId: String = "",
  )
  implicit val writes = Json.writes[RemoveAccountCrmRequest]

}
case class RemoveAccountCrm(log: String => Unit, restRequestMaker: RestRequestMaker.Requests) {
  def run(accountId: String): ClientFailableOp[Unit] = {
    println(s"UNLINK ACC: $accountId")
    restRequestMaker.put[RemoveAccountCrmRequest, Unit](RemoveAccountCrmRequest(), s"object/account/$accountId")
  }

}
