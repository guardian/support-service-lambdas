package manualTest

import java.io.FileInputStream

import com.gu.effects.Http
import com.gu.util.resthttp.RestRequestMaker.{BodyAsString, createBodyFromString}
import com.gu.util.resthttp.Types.{ClientFailure, ClientSuccess}
import com.gu.util.resthttp.{HttpOp, RestRequestMaker}
import manualTest.GetArgs.{ApiKey, FileName}
import manualTest.ReadFile.JsonString
import okhttp3.Request
import play.api.libs.json.{JsSuccess, Json}
import scala.util.Try
import cats.syntax.all._

object RunBatch {

  /*
  this is run to process a batch manually that's been extracted from postman

  run this first in postman for some suitable date range:
  {{instance_url}}/services/data/v{{salesforce_api_version}}/query?q=SELECT+Scenario_Type__c,+Recent_Contact_Creation_Date__c,+Json_For_Zuora__c+from+Duplicate_Contact__c+WHERE+Recent_Contact_Creation_Date__c+<+2016-06-16T00:00:00.000Z+AND+Scenario_Type__c+!=+null+AND+No_Of_Billing_Accounts__c+>=+2+ORDER+BY+Recent_Contact_Creation_Date__c

  Then run this script with args <sf-contact-merge-apikey> <queryResultFileName>
  If you're using intellij it's easier to just run it once using the green arrow, then use the drop down at the top saying RunBatch to
  edit the config and add to the Program Arguments.
   */

  def main(rawArgs: Array[String]): Unit = {

    val result = for {
      args <- GetArgs(rawArgs)
      postString = HttpOp(Http.response).setupRequest(post(args.apiKey)).flatMap(RestRequestMaker.toClientFailableOp)
      jsons <- ReadFile(args.fileName)
      postJsonString = postString.setupRequest[JsonString](jsonString => BodyAsString(jsonString.value))
      requestWithResultAsTry = (jsonString: JsonString) =>
        postJsonString.runRequest(jsonString) match {
          case ClientSuccess(body) if body.value.contains("Success") => Right(())
          case ClientSuccess(body) => Right(body.value)
          case f: ClientFailure => Left(s"failed to call sf contact merge: $f")
        }
      err <- jsons.traverse(requestWithResultAsTry)
    } yield err

    println(s"result: $result")
  }

  def post(apiKey: ApiKey)(postBody: BodyAsString): Request = {
    val headers = Map(
      "x-api-key" -> apiKey.value,
      "content-type" -> "application/json",
    )
    val prodContactMergeUrl = "https://sf-contact-merge-PROD.membership.guardianapis.com/sf-contact-merge"
    RestRequestMaker.buildRequest(headers, prodContactMergeUrl, _.post(createBodyFromString(postBody)))
  }

}

object GetArgs {

  def apply(rawArgs: Array[String]): Either[String, Args] = {
    rawArgs.toList match {
      case apiKey :: fileName :: Nil => Right(Args(ApiKey(apiKey), FileName(fileName)))
      case _ => Left("syntax: $0 <sf-contact-merge-apikey> <queryResultFileName>")
    }
  }

  case class Args(apiKey: ApiKey, fileName: FileName)

  case class ApiKey(value: String) extends AnyVal

  case class FileName(value: String) extends AnyVal

}

object ReadFile {

  case class JsonString(value: String) extends AnyVal

  case class Record(Json_For_Zuora__c: Option[String])

  implicit val readsRecord = Json.reads[Record]

  case class SFQueryResponse(records: List[Record])

  implicit val readsSFQueryResponse = Json.reads[SFQueryResponse]

  def apply(name: FileName): Either[String, List[JsonString]] = {
    Try {
      val json = Json.parse(new FileInputStream(name.value))
      val resp = json.validate[SFQueryResponse]
      resp match {
        case JsSuccess(value, _) => Right(value.records.flatMap(_.Json_For_Zuora__c.map(JsonString.apply)))
        case fail => Left(s"FAIL to parse: $fail")
      }
    }.toEither.left.map(_.toString).flatMap(identity)
  }

}
