package com.com.gu.sf_datalake_export.handlers

import java.time.LocalDate

import com.gu.sf_datalake_export.handlers.StartJobHandler
import com.gu.sf_datalake_export.handlers.StartJobHandler.{ShouldUploadToDataLake, WireResponse}
import com.gu.sf_datalake_export.salesforce_bulk_api.AddQueryToJob.AddQueryRequest
import com.gu.sf_datalake_export.salesforce_bulk_api.BulkApiParams.{BatchSize, ObjectName, SfObjectName, Soql}
import com.gu.sf_datalake_export.salesforce_bulk_api.CreateJob.{CreateJobRequest, JobId}
import com.gu.sf_datalake_export.salesforce_bulk_api.SfQueries
import com.gu.util.config.Stage
import com.gu.util.handlers.LambdaException
import com.gu.util.resthttp.Types.ClientSuccess
import scala.util.{Failure, Success}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class StartJobStepTest extends AnyFlatSpec with Matchers {

  def createJob(req: CreateJobRequest) = {
    req.maybeChunkSize shouldBe Some(BatchSize(250000))
    req.objectType shouldBe SfObjectName("Contact")
    ClientSuccess(JobId("someJobId"))
  }

  def addQuery(req: AddQueryRequest) = {
    req.jobId shouldBe JobId("someJobId")
    req.query shouldBe Soql(SfQueries.contactQuery)
    ClientSuccess(())
  }

  val today = () => LocalDate.of(2018, 10, 22)

  val testSteps = StartJobHandler.steps(today, createJob, addQuery) _

  "startJob.steps" should "create a job with yesterdays date and add the correct query" in {

    val expectedResponse = WireResponse(
      jobId = "someJobId",
      objectName = "Contact",
      jobName = "Contact_2018-10-21",
      uploadToDataLake = false,
    )
    testSteps(ObjectName("Contact"), ShouldUploadToDataLake(false)) shouldBe Success(expectedResponse)
  }

  it should "return failure if object in request is unknown" in {
    testSteps(ObjectName("unknownObject"), ShouldUploadToDataLake(false)) shouldBe Failure(
      LambdaException("invalid object name unknownObject"),
    )
  }

  "UploadToDataLake" should "be set to true by default in PROD" in {
    ShouldUploadToDataLake(None, Stage("PROD")) shouldBe Success(ShouldUploadToDataLake(true))
  }
  it should "be set to true by default in non PROD stages" in {
    ShouldUploadToDataLake(None, Stage("NOT-PROD")) shouldBe Success(ShouldUploadToDataLake(false))
  }

  it should "return an error if attempted to set to true in non PROD ENV" in {
    ShouldUploadToDataLake(Some(true), Stage("NOT-PROD")) shouldBe Failure(
      LambdaException("uploadToDatalake can only be enabled in PROD"),
    )
  }

  it should "should be set to the correct value in PROD" in {
    val actualTrue = ShouldUploadToDataLake(Some(true), Stage("PROD"))
    val actualFalse = ShouldUploadToDataLake(Some(false), Stage("PROD"))
    val expectedResponses = (trueResponse, falseResponse)
    (actualTrue, actualFalse) shouldBe expectedResponses

  }

  val trueResponse = Success(ShouldUploadToDataLake(true))
  val falseResponse = Success(ShouldUploadToDataLake(false))
}
