package com.gu.zuora.fake

import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, GenericError}
import com.gu.util.zuora.ZuoraQuery.{QueryResult, ZuoraQuerier}
import com.gu.util.zuora.{SafeQueryBuilder, ZuoraQuery}
import play.api.libs.json.{Json, Reads}
import scalaz.-\/
import scalaz.syntax.std.either._

object FakeZuoraQuerier {

  def apply(expectedQuery: String, response: String): ZuoraQuery.ZuoraQuerier = new ZuoraQuerier {
    override def apply[QUERYRECORD: Reads](query: SafeQueryBuilder.SafeQuery): ClientFailableOp[ZuoraQuery.QueryResult[QUERYRECORD]] = {
      if (query.queryString == expectedQuery) {
        Json.parse(response).validate[QueryResult[QUERYRECORD]].asEither.disjunction.leftMap(err => GenericError(err.toString))
      } else {
        -\/(GenericError("unexpected query"))
      }
    }
  }

}
