package com.gu.sf_contact_merge.getsfcontacts

import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.getsfcontacts.GetSfAddress.SFContact
import com.gu.sf_contact_merge.getsfcontacts.GetSfContacts.SFContactsForMerge
import com.gu.util.resthttp.LazyClientFailableOp

object GetSfContacts {

  def apply(getSfAddress: GetSfAddress): GetSfContacts = (
    winningSFContactId: SFContactId,
    allSFContactIds: List[SFContactId]
  ) => {
    val winnerContact = getSfAddress.apply(winningSFContactId)
    val other = {
      val otherContactIds = allSFContactIds.filter(_ != winningSFContactId).distinct
      val otherContacts = otherContactIds.map(getSfAddress.apply)
      otherContacts
    }
    SFContactsForMerge(winnerContact, other)
  }

  case class SFContactsForMerge(
    winner: LazyClientFailableOp[SFContact],
    others: List[LazyClientFailableOp[SFContact]]
  )

}
trait GetSfContacts {

  def apply(
    winningSFContactId: SFContactId,
    allSFContactIds: List[SFContactId]
  ): SFContactsForMerge

}
