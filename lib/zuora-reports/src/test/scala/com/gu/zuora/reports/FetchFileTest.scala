package com.gu.zuora.reports

import java.io.ByteArrayInputStream

import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, DownloadStream, GenericError, Requests}
import org.scalatest.AsyncFlatSpec
import org.scalatest.Matchers._
import scalaz.{-\/, \/-}

class FetchFileTest extends AsyncFlatSpec {

  def fakeUpload(stream: DownloadStream, fileName: String) = \/-(s"s3://someBucket/$fileName")

  def getFakeDownloadStream(path: String): ClientFailableOp[DownloadStream] = {
    val fakeContent = "some fake content"
    val inputStream = new ByteArrayInputStream(fakeContent.getBytes)
    \/-(DownloadStream(inputStream, fakeContent.getBytes.length))
  }

  val fetchFile = FetchFile(fakeUpload, getFakeDownloadStream) _

  it should "should upload file and append to results list" in {

    val alreadyFetched = List(FetchedFileInfo("fileId-1", "s3://someBucket/file1"))
    val batchesToFetch = List(FileInfo("fileId-2", "file2"), FileInfo("fileId-3", "file3"))
    val fetchFileRequest = FetchFileRequest(alreadyFetched, batchesToFetch)

    val expectedFetched = FetchedFileInfo("fileId-2", "s3://someBucket/file2") :: alreadyFetched
    val expectedRemainingBatches = batchesToFetch.tail
    val expected = \/-(FetchFileResponse(expectedFetched, expectedRemainingBatches, false))

    fetchFile(fetchFileRequest).shouldBe(expected)

  }

  it should "should return done = true when fetching last batch" in {

    val alreadyFetched = List(FetchedFileInfo("fileId-1", "s3://someBucket/file1"))
    val batchesToFetch = List(FileInfo("fileId-2", "file2"))
    val fetchFileRequest = FetchFileRequest(alreadyFetched, batchesToFetch)

    val expectedFetched = FetchedFileInfo("fileId-2", "s3://someBucket/file2") :: alreadyFetched
    val expectedRemainingBatches = List.empty
    val expected = \/-(FetchFileResponse(expectedFetched, expectedRemainingBatches, true))

    fetchFile(fetchFileRequest).shouldBe(expected)

  }

}
