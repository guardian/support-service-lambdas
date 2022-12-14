package com.gu.zuora.retention.filterCandidates

import com.gu.util.handlers.LambdaException
import com.gu.zuora.reports.dataModel.FetchedFile

import scala.util.{Failure, Success}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class FilterCandidatesTest extends AnyFlatSpec with Matchers {

  val candidatesFetchedFile = FetchedFile("id", "candidatesQuery", "s3://candidatesUri")
  val exclusionsFetchedFile = FetchedFile("id", "exclusionQuery", "s3://exclusionsUri")
  val candidatesIt = List("candidate1", "candidate2").iterator
  val exclusionsIt = List("exclusion1", "exclusion2").iterator
  val filteredIt = List("filtered1").iterator

  private def s3Iterator(uri: String) = uri match {
    case "s3://candidatesUri" => Success(candidatesIt)
    case "s3://exclusionsUri" => Success(exclusionsIt)
    case _ => Failure(LambdaException("some error"))
  }

  private def uploadToS3(filteredCandidates: Iterator[String], key: String) = {
    if (filteredCandidates == filteredIt)
      Success("s3://fakeBucket/filename.csv")
    else
      Failure(LambdaException("wrong iterator!"))
  }

  private def diff(candidates: Iterator[String], exclusions: Iterator[String]) = {
    if (candidates == candidatesIt && exclusions == exclusionsIt)
      filteredIt
    else
      candidatesIt
  }

  private def wiredOperation = FilterCandidates.operation(
    s3Iterator,
    uploadToS3,
    diff,
  ) _

  it should "return error if request doesn't contain exclusion query results file" in {

    val fetchedFiles = List(candidatesFetchedFile)
    val req = FilterCandidatesRequest("someJobId", fetchedFiles, false)
    val res = wiredOperation(req)
    res shouldBe Failure(LambdaException("could not find query result for exclusionQuery"))
  }

  it should "return error if request doesn't contain candidates query results file" in {

    val fetchedFiles = List(exclusionsFetchedFile)
    val req = FilterCandidatesRequest("someJobId", fetchedFiles, false)
    val res = wiredOperation(req)
    res shouldBe Failure(LambdaException("could not find query result for candidatesQuery"))
  }

  it should "return filtered candidates response" in {

    val fetchedFiles = List(candidatesFetchedFile, exclusionsFetchedFile)
    val req = FilterCandidatesRequest("someJobId", fetchedFiles, false)
    val res = wiredOperation(req)
    res shouldBe Success(FilterCandidatesResponse("someJobId", "s3://fakeBucket/filename.csv", false))
  }
}
