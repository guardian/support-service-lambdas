package com.gu.zuora.reports

import java.io.ByteArrayInputStream

import com.gu.util.resthttp.RestRequestMaker.DownloadStream
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess}
import com.gu.zuora.reports.dataModel.{Batch, FetchedFile}
import matchers.should.Matchers._
import org.scalatest.matchers
import org.scalatest.flatspec.AsyncFlatSpec

class FetchFileTest extends AsyncFlatSpec {

  def fakeUpload(stream: DownloadStream, fileName: String) = ClientSuccess(s"s3://someBucket/$fileName")

  def getFakeDownloadStream(path: String): ClientFailableOp[DownloadStream] = {
    val fakeContent = "some fake content"
    val inputStream = new ByteArrayInputStream(fakeContent.getBytes)
    ClientSuccess(DownloadStream(inputStream, fakeContent.getBytes.length.toLong))
  }

  val fetchFile = FetchFile(fakeUpload, getFakeDownloadStream) _

  it should "upload file and append to results list" in {

    val alreadyFetched = List(FetchedFile("fileId-1", "file1", "s3://someBucket/file1.csv"))
    val batchesToFetch = List(Batch("fileId-2", "file2"), Batch("fileId-3", "file3"))
    val fetchFileRequest = FetchFileRequest("someJobId", alreadyFetched, batchesToFetch, true)

    val expectedFetched = FetchedFile("fileId-2", "file2", "s3://someBucket/someJobId/file2.csv") :: alreadyFetched
    val expectedRemainingBatches = batchesToFetch.tail
    val expected = ClientSuccess(FetchFileResponse("someJobId", expectedFetched, expectedRemainingBatches, false, true))

    fetchFile(fetchFileRequest).shouldBe(expected)

  }

  it should "return done = true when fetching last batch" in {

    val alreadyFetched = List(FetchedFile("fileId-1", "file1", "s3://someBucket/someJobId/file1.csv"))
    val batchesToFetch = List(Batch("fileId-2", "file2"))
    val fetchFileRequest = FetchFileRequest("someJobId", alreadyFetched, batchesToFetch, false)

    val expectedFetched = FetchedFile("fileId-2", "file2", "s3://someBucket/someJobId/file2.csv") :: alreadyFetched
    val expectedRemainingBatches = List.empty
    val expected = ClientSuccess(FetchFileResponse("someJobId", expectedFetched, expectedRemainingBatches, true, false))

    fetchFile(fetchFileRequest).shouldBe(expected)

  }

}
