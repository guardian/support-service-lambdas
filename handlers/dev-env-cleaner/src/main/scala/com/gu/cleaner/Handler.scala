package com.gu.cleaner

import java.io.{ByteArrayInputStream, ByteArrayOutputStream, InputStream, OutputStream}
import java.time.LocalDate

import cats.implicits._
import com.amazonaws.services.lambda.runtime.{ClientContext, CognitoIdentity, Context, LambdaLogger}
import com.gu.cleaner.CancelAccount.CancelAccountRequest
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

object Handler {

  def main(args: Array[String]): Unit = {
    println("main: STARTING!")
    // FOR TESTING
    handleRequest(
      new ByteArrayInputStream(Array[Byte]()), new ByteArrayOutputStream(), new Context {
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
      })
    println("main: FINISHED!")
  }

  def handleRequest(
    input: InputStream,
    output: OutputStream,
    context: Context
  ): Unit = {
    def log(message: String) = context.getLogger.log(message)

    log("starting lambda!")
    val stageForZuora = Stage("DEV") // always clean dev, even in PROD
    val loadConfig = LoadConfigModule(stageForZuora, GetFromS3.fetchString)
    val response = RawEffects.response
    val downloadResponse = RawEffects.downloadResponse
    val maybeSuccess = for {
      zuoraRestConfig <- loadConfig[ZuoraRestConfig]
      requests = ZuoraRestRequestMaker(response, zuoraRestConfig)
      cancelSub = CancelSub(log, requests)
      cancelAccount = CancelAccount(log, requests)
      downloadRequests = ZuoraAquaRequestMaker(downloadResponse, zuoraRestConfig)
      //      zuoraQuerier = ZuoraQuery(requests)
      aquaQuerier = Querier.lowLevel(downloadRequests) _
      getJobResult = GetJobResult(downloadRequests.get[AquaJobResponse]) _
      //      zuoraHelper = ZuoraSarService(requests, downloadRequests, zuoraQuerier)
      _ <- new Steps(log).steps(aquaQuerier, getJobResult, downloadRequests, cancelSub, cancelAccount, () => RawEffects.now().toLocalDate)
    } yield ()
    maybeSuccess.toTry.get
    log("finished successfully - sending metric!")
    putMetric()
  }

  def putMetric(): Unit = {
    //TODO
  }

}
class Steps(log: String => Unit) {

  def steps(
    aquaQuerier: AquaQueryRequest => ClientFailableOp[String],
    getJobResult: JobResultRequest => ClientFailableOp[JobResult],
    downloadRequests: RestRequestMaker.Requests,
    cancelSub: CancelSub,
    cancelAccount: CancelAccount,
    today: () => LocalDate
  ): Either[Throwable, Unit] = {
    val subs_to_cancel = "subs_to_cancel"
    val subsQuery = AquaQuery(
      subs_to_cancel,
      """select Id, TermEndDate
        |from Subscription
        |where billtocontact.WorkEmail = 'integration-test@gu.com' and Status = 'Active' and account.Status = 'Active'
        |""".stripMargin
    )
    val accounts_to_cancel = "accounts_to_cancel"
    val accountsQuery = AquaQuery(
      accounts_to_cancel,
      """select Id
        |from Account
        |where billtocontact.WorkEmail = 'integration-test@gu.com' and Status = 'Active'
        |""".stripMargin
    )
    val request = AquaQueryRequest(
      name = "test_accounts_and_subs",
      queries = List(subsQuery, accountsQuery)
    )
    val zRes = for {
      jobId <- aquaQuerier(request)
      batches <- waitForResult(jobId, getJobResult)
      streams <- batches.toList.traverse { batch =>
        downloadRequests.getDownloadStream(s"batch-query/file/${batch.fileId}").map(stream => (batch.name, stream.stream))
      }
      queryResults = streams.map {
        case (name, stream) =>
          val csvLines = Source.fromInputStream(stream).getLines()
          val values = csvLines.drop(1).map(_.split(',').toList) // first line is a header
          (name, values)
      }.toMap
      _ <- queryResults(subs_to_cancel).map { case id :: termEndDate :: Nil => cancelSub.run(id, dateToCancel(LocalDate.parse(termEndDate), today())) }.toList.sequence
      _ <- queryResults(accounts_to_cancel).map { case id :: Nil => cancelAccount.run(id) }.toList.sequence
    } yield ()
    zRes.toDisjunction.leftMap(failure => new RuntimeException(failure.toString))

  }

  def dateToCancel(termEndDate: LocalDate, today: LocalDate): LocalDate =
    if (termEndDate.isBefore(today))
      termEndDate
    else
      today

  @tailrec
  final def waitForResult(jobId: String, getJobResult: JobResultRequest => ClientFailableOp[JobResult]): ClientFailableOp[Seq[Batch]] = {
    getJobResult(JobResultRequest(jobId, false, None)) match {
      case ClientSuccess(success) => success match {
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
    cancellationPolicy: String = "SpecificDate"
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
    Status: String = "Canceled"
  )
  implicit val writes = Json.writes[CancelAccountRequest]

}
case class CancelAccount(log: String => Unit, restRequestMaker: RestRequestMaker.Requests) {
  def run(accountId: String): ClientFailableOp[Unit] = {
    println(s"CANCEL ACC: $accountId")
        restRequestMaker.put[CancelAccountRequest, Unit](CancelAccountRequest(), s"object/account/$accountId")
  }

}
