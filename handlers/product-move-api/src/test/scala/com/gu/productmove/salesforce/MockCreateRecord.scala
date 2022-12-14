package com.gu.productmove.salesforce

import com.gu.productmove.salesforce.CreateRecord.{CreateRecordRequest, CreateRecordResponse}
import zio.{IO, ZIO}

class MockCreateRecord(responses: Map[CreateRecordRequest, CreateRecordResponse]) extends CreateRecord {

  private var mutableStore: List[CreateRecordRequest] = Nil // we need to remember the side effects

  def requests = mutableStore.reverse

  override def create(createRecordRequest: CreateRecordRequest): ZIO[Any, String, CreateRecordResponse] = {
    mutableStore = createRecordRequest :: mutableStore

    responses.get(createRecordRequest) match
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse)
      case None => ZIO.fail(s"Salesforce error message")
  }
}

object MockCreateRecord {
  def requests: ZIO[MockCreateRecord, Nothing, List[CreateRecordRequest]] =
    ZIO.serviceWith[MockCreateRecord](_.requests)
}
