import com.gu.batchemailsender.api.batchemail.model.{EmailBatch, EmailBatchItem}
import com.gu.util.apigateway.ApiGatewayRequest
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import play.api.libs.json.Json

//
//val asString =
//  """
//    |[
//    |{
//    |    "payload": {
//    |        "to_address": "leigh-anne.mathieson@theguardian.com",
//    |        "subscriber_id": "A-S00044748",
//    |        "sf_contact_id": "0036E00000KtDaHQAV",
//    |        "product": "Membership",
//    |        "next_charge_date": "2018-09-03",
//    |        "last_name": "bla",
//    |        "identity_id": "30002177",
//    |        "first_name": "something",
//    |        "email_stage": "MBv1 - 1"
//    |    },
//    |    "object_name": "Card_Expiry__c"
//    |}
//    |
//    |]
//  """.stripMargin

val stringFRomlog = "[ \n { \n \"payload\":{ \n \t \"record_id\": \"abcd\",\n \"to_address\":\"leigh-anne.mathieson@theguardian.com\",\n \"subscriber_id\":\"A-S00044748\",\n \"sf_contact_id\":\"0036E00000KtDaHQAV\",\n \"product\":\"Membership\",\n \"next_charge_date\":\"2018-09-03\",\n \"last_name\":\"bla\",\n \"identity_id\":\"30002177\",\n \"first_name\":\"something\",\n \"email_stage\":\"MBv1 - 1\"\n },\n \"object_name\":\"Card_Expiry__c\"\n }\n]"

println("stuff")
val hij = Json.toJson(stringFRomlog).as[List[EmailBatchItem]]
println(Json.toJson(stringFRomlog).as[EmailBatch])

//val what = ApiGatewayRequest(None,Some([
//  {
//    "payload": {
//    "to_address": "leigh-anne.mathieson@theguardian.com",
//    "subscriber_id": "A-S00044748",
//    "sf_contact_id": "0036E00000KtDaHQAV",
//    "product": "Membership",
//    "next_charge_date": "2018-09-03",
//    "last_name": "bla",
//    "identity_id": "30002177",
//    "first_name": "something",
//    "email_stage": "MBv1 - 1"
//  },
//    "object_name": "Card_Expiry__c"
//  }
//
//  ]))

//val maybeEmailBatch: Option[List[EmailBatchItem]] = req.body match {
//  case Some(body) => Some(Json.toJson(body).as[EmailBatch].emailBatchItems)
//  case None => None
//}
