package com.gu.sf_contact_merge.getsfcontacts

import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.getsfcontacts.DedupSfContacts.SFContactsForMerge

object DedupSfContacts {

  def apply: DedupSfContacts = (
    sfContactIds: SFContactsForMerge[SFContactId]
  ) => {
    val winnerContact = sfContactIds.winner
    val other = sfContactIds.others.filter(_ != sfContactIds.winner).distinct
    SFContactsForMerge(winnerContact, other)
  }

  case class SFContactsForMerge[CONTACT](
      winner: CONTACT,
      others: List[CONTACT],
  ) {
    def map[OUT](f: CONTACT => OUT): SFContactsForMerge[OUT] = {
      SFContactsForMerge(f(winner), others.map(f))
    }
  }

}
trait DedupSfContacts {

  def apply(
      sfContactIds: SFContactsForMerge[SFContactId],
  ): SFContactsForMerge[SFContactId]

}
