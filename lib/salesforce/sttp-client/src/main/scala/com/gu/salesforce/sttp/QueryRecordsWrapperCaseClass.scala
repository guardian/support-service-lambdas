package com.gu.salesforce.sttp

case class QueryRecordsWrapperCaseClass[T](records: List[T], nextRecordsUrl: Option[String])
