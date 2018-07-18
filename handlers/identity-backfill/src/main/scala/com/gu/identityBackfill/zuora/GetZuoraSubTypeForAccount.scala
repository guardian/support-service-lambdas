package com.gu.identityBackfill.zuora

import com.gu.identityBackfill.Types._
import com.gu.identityBackfill.zuora.GetZuoraSubTypeForAccount.ReaderType.{NoReaderType, ReaderTypeValue}
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.zuora.ZuoraQuery.ZuoraQuerier
import com.gu.util.zuora.SafeQueryBuilder.Implicits._
import play.api.libs.json.Json

object GetZuoraSubTypeForAccount {

  case class WireResponse(ReaderType__c: Option[String])
  implicit val reads = Json.reads[WireResponse]

  sealed trait ReaderType
  object ReaderType {

    case object NoReaderType extends ReaderType

    case class ReaderTypeValue(value: String) extends ReaderType

  }

  def apply(zuoraQuerier: ZuoraQuerier)(accountId: AccountId): ClientFailableOp[List[ReaderType]] = {

    for {
      contactQuery <- zoql"SELECT ReaderType__c FROM Subscription where AccountId=${accountId.value}"
      queryResults <- zuoraQuerier[WireResponse](contactQuery)
    } yield queryResults.records.map(_.ReaderType__c.map(ReaderTypeValue.apply).getOrElse(NoReaderType))

  }

}
