package com.gu.productmove.framework

import sttp.tapir.Schema
import sttp.tapir.generic.Derived

object InlineSchema {

  def inlineSchema[T](using d: Derived[Schema[T]]): Schema[T] =
    d.value.name(None)

}
