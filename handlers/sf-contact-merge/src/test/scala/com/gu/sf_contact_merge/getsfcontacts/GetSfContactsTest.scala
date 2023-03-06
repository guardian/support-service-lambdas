package com.gu.sf_contact_merge.getsfcontacts

import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.getsfcontacts.DedupSfContacts.SFContactsForMerge
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class GetSfContactsTest extends AnyFlatSpec with Matchers {

  "getSfContacts" should "get the winner and the other correctly (lazy)" in {

    val actual = DedupSfContacts.apply(SFContactsForMerge(SFContactId("a1"), List(SFContactId("a2"))))

    actual should be(SFContactsForMerge(SFContactId("a1"), List(SFContactId("a2"))))

  }

  "getSfContacts" should "remove the main contact from the ones to fetch later" in {

    val actual = DedupSfContacts.apply(SFContactsForMerge(SFContactId("a1"), List(SFContactId("a1"))))

    actual should be(SFContactsForMerge(SFContactId("a1"), List()))

  }

  "getSfContacts" should "remove duplicates from the list" in {

    val actual =
      DedupSfContacts.apply(SFContactsForMerge(SFContactId("a1"), List(SFContactId("a2"), SFContactId("a2"))))

    actual should be(SFContactsForMerge(SFContactId("a1"), List(SFContactId("a2"))))

  }

}
