/**
 * Human-readable name of a lesson for notification templates ({ders}).
 *
 * `lessonType` is the PACKAGE kind ("group" / "one-on-one") and is empty on most
 * documents, so using it alone rendered {ders} as an empty string. The lesson's
 * own `title` ("Grup Reformer", "Power pilates") is what members and trainers
 * recognise, so it wins; `type` and `lessonType` are fallbacks for older docs.
 */

function lessonLabel(lesson) {
  if (!lesson) return '';
  return lesson.title || lesson.type || lesson.lessonType || '';
}

module.exports = { lessonLabel };
