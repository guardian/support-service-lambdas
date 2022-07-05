package com.gu.productmove.framework

import sttp.tapir.Schema
import sttp.tapir.generic.Derived

object InlineSchema {

  def inlineSchema[T](d: Schema[T]): Schema[T] =
    d.name(None)

}
