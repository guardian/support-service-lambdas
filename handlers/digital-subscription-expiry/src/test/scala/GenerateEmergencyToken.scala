import com.gu.cas.{PrefixedTokens, SevenDay, TokenPayload}
import com.gu.digitalSubscriptionExpiry.emergencyToken.{EmergencyTokens, EmergencyTokensConfig, GetTokenExpiry}
import com.gu.digitalSubscriptionExpiry.responses.{Expiry, ExpiryType, SuccessResponse}
import com.gu.effects.GetFromS3
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.reader.Types.ApiGatewayOp.ReturnWithResponse
import org.joda.time.Weeks
import play.api.libs.json.Json

import java.time.LocalDate

// this gets the prod secret and makes a code that'll work with https://content-auth.guardian.co.uk/subs
// just fill in monthsToGive or weeksToGive and make sure you have your AWS credentials
object GenerateEmergencyToken extends App {

  val monthsToGive = 9
  val weeksToGive = (52 * monthsToGive) / 12

  val loadConfig = LoadConfigModule(Stage.Prod, GetFromS3.fetchString)
  val emergencyTokensConfig = loadConfig.load[EmergencyTokensConfig].getOrElse(throw new RuntimeException("failed to load config"))
  // replace "secret" with the prod secret to get a code that'll work with https://content-auth.guardian.co.uk/subs
  val codec = PrefixedTokens(secretKey = emergencyTokensConfig.secret, emergencySubscriberAuthPrefix = emergencyTokensConfig.prefix)
  val tokenPayload = TokenPayload.apply(org.joda.time.LocalDate.now())(Weeks.weeks(weeksToGive), SevenDay)
  val encoded = codec.encode(tokenPayload)
  val expectedResponse = expectedExpiryForDate(LocalDate.now().plusWeeks(weeksToGive).plusDays(1))
  val actualResponse = GetTokenExpiry(
    EmergencyTokens("G99", codec),
    () => LocalDate.now(),
  )(encoded)
  if (actualResponse != expectedResponse) throw new RuntimeException(s"token '$encoded' did not work correctly")
  println("encoded token is: " + encoded)

  private def expectedExpiryForDate(expiryDate: LocalDate) = {
    val expiry = Expiry(
      expiryDate = expiryDate,
      expiryType = ExpiryType.SUB,
      subscriptionCode = Some(SevenDay),
      provider = Some("G99"),
    )

    val responseBody = Json.prettyPrint(Json.toJson(SuccessResponse(expiry)))
    ReturnWithResponse(ApiResponse("200", responseBody))
  }

}
