package com.gu.recogniser

import cats.syntax.all._
import com.gu.util.resthttp.RestRequestMaker
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientFailure, ClientSuccess}
import com.gu.zuora.reports.aqua.{AquaJobResponse, AquaQuery, AquaQueryRequest}
import com.gu.zuora.reports.dataModel.Batch
import com.gu.zuora.reports._
import kantan.csv.ops._
import kantan.csv.{CsvReader, HeaderDecoder, ReadResult, rfc}

import scala.annotation.tailrec

/*
This blocking query is only suitable for ones that will definitely execute within the lambda execution timeout.
For longer running queries either wait for the zuora callback via API gateway, or poll with step functions or similar.
 */
trait BlockingAquaQuery {
  def executeQuery[CsvHeaderDecoder: HeaderDecoder](
      queryString: String,
  ): ClientFailableOp[CsvReader[ReadResult[CsvHeaderDecoder]]]
}

class BlockingAquaQueryImpl(
    aquaQuerier: AquaQueryRequest => ClientFailableOp[String],
    downloadRequests: RestRequestMaker.Requests,
    log: String => Unit,
) extends BlockingAquaQuery {

  override def executeQuery[CsvHeaderDecoder: HeaderDecoder](
      queryString: String,
  ): ClientFailableOp[CsvReader[ReadResult[CsvHeaderDecoder]]] = {
    val queryName = "expired_gift_and_refunds_undistributed"
    val subsQuery = AquaQuery(queryName, queryString)
    val request = AquaQueryRequest(
      name = "undistributed_revenue_schedules",
      queries = List(subsQuery),
    )
    for {
      jobId <- aquaQuerier(request)
      batches <- waitForResult(jobId, GetJobResult(downloadRequests.get[AquaJobResponse]))
      streams <- batches.toList.traverse { batch =>
        downloadRequests
          .getDownloadStream(s"batch-query/file/${batch.fileId}")
          .map(stream => (batch.name, stream.stream))
      }
      queryResults = streams.map { case (name, csvStream) =>
        val values = csvStream.asCsvReader[CsvHeaderDecoder](rfc.withHeader)
        (name, values)
      }.toMap
      results = queryResults(queryName)
    } yield results
  }

  @tailrec
  final def waitForResult(
      jobId: String,
      getJobResult: JobResultRequest => ClientFailableOp[JobResult],
  ): ClientFailableOp[Seq[Batch]] = {
    getJobResult(JobResultRequest(jobId, false, None)) match {
      case ClientSuccess(success) =>
        success match {
          case pending: Pending =>
            Thread.sleep(1000)
            log(s"still pending: $pending")
            waitForResult(jobId, getJobResult)
          case c: Completed =>
            ClientSuccess(c.batches)
        }
      case fail: ClientFailure => fail
    }
  }

}
