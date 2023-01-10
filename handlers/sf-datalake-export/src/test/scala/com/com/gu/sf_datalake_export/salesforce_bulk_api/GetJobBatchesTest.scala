package com.com.gu.sf_datalake_export.salesforce_bulk_api

import com.gu.sf_datalake_export.salesforce_bulk_api.CreateJob.JobId
import com.gu.sf_datalake_export.salesforce_bulk_api.GetJobBatches
import com.gu.sf_datalake_export.salesforce_bulk_api.GetJobBatches.{BatchId, BatchInfo, Completed, InProgress}
import com.gu.util.resthttp.JsonHttp.{GetMethod, StringHttpRequest}
import com.gu.util.resthttp.RestRequestMaker._
import com.gu.util.resthttp.Types.ClientSuccess
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class GetJobBatchesTest extends AnyFlatSpec with Matchers {

  it should "create a request ok" in {

    val actual = GetJobBatches.toRequest(JobId("someId"))

    val expected = new StringHttpRequest(
      requestMethod = GetMethod,
      relativePath = RelativePath("/services/async/44.0/job/someId/batch"),
      urlParams = UrlParams.empty,
    )

    actual should be(expected)
  }

  it should "create response" in {
    val sfResponse = """<?xml version="1.0" encoding="UTF-8"?>
        |<batchInfoList
        |   xmlns="http://www.force.com/2009/06/asyncapi/dataload">
        | <batchInfo>
        |  <id>batchId1</id>
        |  <jobId>someJobdId</jobId>
        |  <state>Completed</state>
        |  <createdDate>2009-04-14T18:15:59.000Z</createdDate>
        |  <systemModstamp>2009-04-14T18:16:09.000Z</systemModstamp>
        |  <numberRecordsProcessed>0</numberRecordsProcessed>
        |  <numberRecordsFailed>0</numberRecordsFailed>
        |  <totalProcessingTime>0</totalProcessingTime>
        |  <apiActiveProcessingTime>0</apiActiveProcessingTime>
        |  <apexProcessingTime>0</apexProcessingTime>
        | </batchInfo>
        | <batchInfo>
        |  <id>batchId2</id>
        |  <jobId>someJobdId</jobId>
        |  <state>InProgress</state>
        |  <createdDate>2009-04-14T18:16:00.000Z</createdDate>
        |  <systemModstamp>2009-04-14T18:16:09.000Z</systemModstamp>
        |  <numberRecordsProcessed>800</numberRecordsProcessed>
        |  <numberRecordsFailed>0</numberRecordsFailed>
        |  <totalProcessingTime>5870</totalProcessingTime>
        |  <apiActiveProcessingTime>0</apiActiveProcessingTime>
        |  <apexProcessingTime>2166</apexProcessingTime>
        | </batchInfo>
        |</batchInfoList>
      """.stripMargin

    val expectedBatches = Seq(
      BatchInfo(BatchId("batchId1"), Completed),
      BatchInfo(BatchId("batchId2"), InProgress),
    )
    GetJobBatches.toResponse(BodyAsString(sfResponse)) shouldBe ClientSuccess(expectedBatches)
  }
}
