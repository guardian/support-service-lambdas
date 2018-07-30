package com.gu.zuora.fake

import com.gu.util.resthttp.Types.{ClientFailableOp, GenericError}
import com.gu.util.zuora.ZuoraQuery.{QueryResult, ZuoraQuerier}
import com.gu.util.zuora.{SafeQueryBuilder, ZuoraQuery}
import org.scalatest.Matchers
import play.api.libs.json.{Json, Reads}
import scalaz.syntax.std.either._

object FakeZuoraQuerier extends Matchers {

  def apply(expectedQuery: String, response: String): ZuoraQuery.ZuoraQuerier = new ZuoraQuerier {
    override def apply[QUERYRECORD: Reads](query: SafeQueryBuilder.SafeQuery): ClientFailableOp[ZuoraQuery.QueryResult[QUERYRECORD]] = {
      query.queryString should be(expectedQuery)
      Json.parse(response).validate[QueryResult[QUERYRECORD]].asEither.disjunction.leftMap(err => GenericError(err.toString)).toClientFailableOp
    }
  }

}
