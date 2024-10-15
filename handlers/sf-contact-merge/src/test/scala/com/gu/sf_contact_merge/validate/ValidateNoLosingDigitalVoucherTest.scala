package com.gu.sf_contact_merge.validate

import com.gu.sf_contact_merge.getsfcontacts.WireContactToSfContact.Types.IsDigitalVoucherUser
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class ValidateNoLosingDigitalVoucherTest extends AnyFlatSpec with Matchers {

  it should "not object to an empty list" in {

    val input: List[ClientFailableOp[IsDigitalVoucherUser]] = List()

    val actual = ValidateNoLosingDigitalVoucher(input)

    actual should be(ContinueProcessing(()))
  }

  it should "not object to a couple of falses" in {

    val input: List[ClientFailableOp[IsDigitalVoucherUser]] =
      List(
        ClientSuccess(IsDigitalVoucherUser(false)),
        ClientSuccess(IsDigitalVoucherUser(false)),
      )

    val actual = ValidateNoLosingDigitalVoucher(input)

    actual should be(ContinueProcessing(()))
  }

  it should "object to a true" in {

    val input: List[ClientFailableOp[IsDigitalVoucherUser]] =
      List(
        ClientSuccess(IsDigitalVoucherUser(true)),
      )

    val actual = ValidateNoLosingDigitalVoucher(input)

    actual.toDisjunction.left.map(_.statusCode) should be(Left("404"))
  }

  it should "object to an error" in {

    val input: List[ClientFailableOp[IsDigitalVoucherUser]] =
      List(
        GenericError("test", ""),
      )

    val actual = ValidateNoLosingDigitalVoucher(input)

    actual.toDisjunction.left.map(_.statusCode) should be(Left("500"))
  }

}
