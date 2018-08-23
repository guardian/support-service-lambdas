package com.gu.sf_contact_merge

import com.gu.sf_contact_merge.getaccounts.GetEmails.FirstName
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import org.scalatest.{FlatSpec, Matchers}
import scalaz.-\/

class GetFirstNameToUseTest extends FlatSpec with Matchers {

  it should "firstNameIfNot both present should use winning one" in {

    val actual = GetFirstNameToUse.firstNameIfNot(Some(FirstName("oldname")), Some(FirstName("identityname")))
    actual should be(ContinueProcessing(FirstName("oldname")))

  }

  it should "firstNameIfNot old missing should use identity one" in {

    val actual = GetFirstNameToUse.firstNameIfNot(None, Some(FirstName("identityname")))
    actual should be(ContinueProcessing(FirstName("identityname")))

  }

  it should "firstNameIfNot if no identity or old name return a 404" in {

    val actual = GetFirstNameToUse.firstNameIfNot(None, None)
    actual.toDisjunction.leftMap(_.statusCode) should be(-\/("404"))

  }

}
