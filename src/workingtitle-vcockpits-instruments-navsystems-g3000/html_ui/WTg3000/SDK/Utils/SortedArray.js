/**
 * An array that maintains its elements in a sorted order.
 * @template T
 */
class WT_SortedArray {
    /**
     * @param {(a:T, b:T) => Number} comparator - the function to use to determine the order of elements. The function
     *                                            should take two argument, a and b, and return a negative number if
     *                                            a is to be sorted before b, 0 if a is to be sorted neutrally with
     *                                            respect to b, or a positive number if a is to be sorted after b.
     * @param {Iterable<T>} [iterable] - an iterable of elements with which to initially populate the new array.
     * @param {(a:T, b:T) => Boolean} [equals] - the function to use to determine whether two elements are equal.
     */
    constructor(comparator, iterable, equals) {
        this._array = iterable ? [...iterable] : [];
        this._comparator = comparator;
        this._equals = equals ? equals : (a, b) => a === b;
        this._array.sort(comparator);
    }

    /**
     * The backing Array object of this sorted array.
     * @readonly
     * @type {Array<T>}
     */
    get array() {
        return this._array;
    }

    /**
     * This sorted array's sorting function.
     * @readonly
     * @type {(a:T, b:T) => Number}
     */
    get comparator() {
        return this._comparator;
    }

    /**
     * This sorted array's equality function.
     * @readonly
     * @type {(a:T, b:T) => Boolean}
     */
    get equals() {
        return this._equals;
    }

    _findIndex(element, first = true) {
        let min = 0;
        let max = this.array.length;
        let index = Math.floor((min + max) / 2);

        while (min < max) {
            let compare = this.comparator(element, this.array[index]);
            if (compare < 0) {
                max = index;
            } else if (compare > 0) {
                min = index + 1;
            } else {
                break;
            }
            index = Math.floor((min + max) / 2);
        }
        let delta = first ? -1 : 1;
        while (index + delta < this.array.length && this.comparator(element, this.array[index + delta]) === 0) {
            index += delta;
        }
        return index;
    }

    _searchEquals(element, first) {
        let index = first;
        while (index >= 0 && index < this.array.length && this.comparator(element, this.array[index]) === 0) {
            if (this.equals(element, this.array[index])) {
                return index;
            }
            index++;
        }
        return -1;
    }

    /**
     * Gets the number of elements in this array.
     * @returns {Number} the number of elements in this array.
     */
    length() {
        return this.array.length;
    }

    /**
     * Gets the element at the specified index, if it exists.
     * @param {Number} index - the index.
     * @returns {T} the element at the specified index, or undefined if the index is out of bounds.
     */
    get(index) {
        return this.array[index];
    }

    /**
     * Gets the first element in this array, if it exists.
     * @returns {T} the first element in this array, or undefined if this array is empty.
     */
    first() {
        return this.array[0];
    }

    /**
     * Gets the last element in this array, if it exists.
     * @returns {T} the last element in this array, or undefined if this array is empty.
     */
    last() {
        return this.array[this.array.length - 1];
    }

    /**
     * Checks whether this array contains an element. Returns true if and only if there is at least one element in this
     * array which is equal to the specified element according to this array's equality function.
     * @param {T} element - the element to check.
     * @returns {Boolean} whether this array contains the element.
     */
    has(element) {
        return this._searchEquals(this._findIndex(element)) >= 0;
    }

    /**
     * Inserts an element into this array. The element will be inserted at the lowest index such that it is located
     * after all the existing elements in the array sorted before it according to this array's sorting function. All
     * existing elements located at indexes greater than or equal to the index at which the element was inserted are
     * shifted to the right.
     * @param {T} element - the element to insert.
     * @returns {Number} the index at which the element was placed.
     */
    insert(element) {
        let index = this._findIndex(element, false);
        this.array.splice(index, 0, element);
        return index;
    }

    /**
     * Removes the first occurrence of an element from this array. This array is searched for the first element which
     * is equal to the specified element according to this array's equality function, the matching element is removed,
     * and all elements after it are shifted to the left.
     * @param {T} element - the element to remove.
     * @returns {Number} the (former) index of the removed element, or -1 if no element was removed.
     */
    remove(element) {
        let index = this._searchEquals(this._findIndex(element));
        if (index >= 0) {
            this.array.splice(index, 1);
        }
        return index;
    }

    /**
     * Finds the index of the first occurrence of an element in this array. This array is searched for the first element
     * which is equal to the specified element according to this array's equality function, and its index is returned.
     * @param {T} element - the element for which to search.
     * @returns {Number} the index of the first occurrence of the specified element, or -1 if no such element was
     *                   found.
     */
    indexOf(element) {
        return this._searchEquals(element, this._findIndex(element));
    }

    /**
     * Removes all elements from this array.
     */
    clear() {
        this._array = [];
    }

    /**
     * Gets an IterableIterator over all elements in this array.
     * @returns {IterableIterator<T>} an IterableIterator over all elements in this array.
     */
    values() {
        return this.array.values();
    }

    [Symbol.iterator]() {
        return this.array.values();
    }
}