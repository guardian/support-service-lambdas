package com.gu.zuora.sar

import com.gu.util.resthttp.RestRequestMaker

import scala.util.{Success, Try}

class S3HelperStub(
  checkForResults: Try[S3StatusResponse],
  writeResult: Either[S3Error, S3WriteSuccess],
  writeInvoiceResults: Either[S3Error, List[S3WriteSuccess]]) extends S3Service {
  override def checkForResults(initiationId: String, config: ZuoraSarConfig): Try[S3StatusResponse] = checkForResults
  override def copyResultsToCompleted(initiationReference: String, config: ZuoraSarConfig): Either[S3Error, S3WriteSuccess] = writeResult
  override def writeFailedResult(initiationId: String, zuoraError: ZuoraSarError, config: ZuoraSarConfig): Either[S3Error, S3WriteSuccess] = writeResult
  override def writeSuccessAccountResult(initiationId: String, zuoraSuccess: ZuoraAccountSuccess, config: ZuoraSarConfig): Either[S3Error, S3WriteSuccess] = writeResult
  override def writeSuccessInvoiceResult(initiationId: String, zuoraSuccess: List[RestRequestMaker.DownloadStream], config: ZuoraSarConfig): Either[S3Error, List[S3WriteSuccess]] = writeInvoiceResults
}

object S3HelperStub {
  val successfulSarS3ResultResponse: Success[S3CompletedPathFound] = Success(S3CompletedPathFound(List("s3Location")))
  val failedSarS3ResultResponse: Success[S3FailedPathFound] = Success(S3FailedPathFound())
  val noS3ResultsFoundResponse: Success[S3NoResultsFound] = Success(S3NoResultsFound())

  val successfullyWroteAccountToS3Response = Right(S3WriteSuccess())
  val successfullyWroteInvoicesToS3Response = Right(List(S3WriteSuccess()))
  val failedToWriteToS3Response = Left(S3Error("couldn't write to s3"))

  def withSuccessResponse = new S3HelperStub(successfulSarS3ResultResponse, successfullyWroteAccountToS3Response, successfullyWroteInvoicesToS3Response)
  def withPendingResponse = new S3HelperStub(noS3ResultsFoundResponse, successfullyWroteAccountToS3Response, successfullyWroteInvoicesToS3Response)
  def withFailedResponse = new S3HelperStub(failedSarS3ResultResponse, failedToWriteToS3Response, failedToWriteToS3Response)
}
