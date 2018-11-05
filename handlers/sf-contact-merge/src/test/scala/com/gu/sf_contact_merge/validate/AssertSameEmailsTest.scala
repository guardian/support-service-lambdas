package com.gu.sf_contact_merge.validate

import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.{EmailAddress, LastName}
import com.gu.sf_contact_merge.validate.GetVariations.{Differing, HasAllowableVariations, HasNoVariations}
import org.scalatest.{FlatSpec, Matchers}

class AssertSameEmailsTest extends FlatSpec with Matchers {

  it should "be all ok with the same email addresses" in {
    val testData = List("hi@gu.com", "hi@gu.com").map(email => EmailAddress(email))

    GetVariations.forEmailAddress.apply(testData) should be(HasNoVariations(EmailAddress("hi@gu.com")))

  }

  it should "complain with different email addresses" in {
    val testData = List("hi@gu.com", "lo@gu.com").map(email => EmailAddress(email))

    GetVariations.forEmailAddress.apply(testData) should be(Differing(testData))

  }

  it should "complain with different email addresses even if +gnm is elsewhere" in {
    val testData = List("hi@gu.com", "l+gnmo@gu.com").map(email => EmailAddress(email))

    GetVariations.forEmailAddress.apply(testData) should be(Differing(testData))

  }

  it should "be all ok with the same email addresses only differ by gnm" in {
    val testData = List("hi@gu.com", "hi+gnm@gu.com").map(email => EmailAddress(email))

    GetVariations.forEmailAddress.apply(testData) should be(HasAllowableVariations(EmailAddress("hi@gu.com")))

  }

  it should "be all ok with the same email addresses only differ by gnm with a number" in {
    val testData = List("hi@gu.com", "hi+gnm1@gu.com").map(email => EmailAddress(email))

    GetVariations.forEmailAddress.apply(testData) should be(HasAllowableVariations(EmailAddress("hi@gu.com")))

  }

  it should "be happy that superficially different items are the same if they are transformed" in {
    val testData = List("JOHN", "john").map(LastName.apply)

    GetVariations.forLastName.apply(testData) should be(HasAllowableVariations(LastName("john")))

  }

  it should "be happy that actually different items are the still different if they are transformed" in {
    val testData = List("JOHN", "JOHNHI").map(LastName.apply)

    GetVariations.forLastName.apply(testData) should be(Differing(testData))

  }

}
