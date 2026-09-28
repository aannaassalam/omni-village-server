const router = require("express").Router();
const countries_controller = require("../Controllers/countries");
const ControllerWrapper = require("../utils/ControllerWrapper");

/**
 * @swagger
 * /countries:
 *    get:
 *      tags:
 *        - Countries
 *      summary: List countries.
 *      description: Master list of countries used for questionnaire targeting and village linkage.
 *      produces:
 *        - application/json
 *
 *      parameters:
 *       - name: active
 *         in: query
 *         description: Pass "true" to return only active countries.
 *         required: false
 *         schema:
 *           type: string
 *
 *      responses:
 *        200:
 *          description: Successfully fetched data.
 *        500:
 *          description: Internal Server Error
 */
router.get("/", ControllerWrapper(countries_controller.get_countries));

/**
 * @swagger
 * /countries/add-country:
 *    post:
 *      tags:
 *        - Countries
 *      summary: Add a country.
 *      description: The lowercased name is the join key back to villages.country and user.country.
 *      produces:
 *        - application/json
 *
 *      parameters:
 *       - name: body
 *         in: body
 *         description:
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             display_name:
 *               type: string
 *             iso2:
 *               type: string
 *             phone_code:
 *               type: string
 *             currency:
 *               type: string
 *
 *      responses:
 *        200:
 *          description: Successfully added data.
 *        400:
 *          description: Bad request
 *        500:
 *          description: Internal Server Error
 */
router.post("/add-country", ControllerWrapper(countries_controller.add_country));

/**
 * @swagger
 * /countries/edit-country:
 *    put:
 *      tags:
 *        - Countries
 *      summary: Edit a country.
 *      produces:
 *        - application/json
 *
 *      parameters:
 *       - name: body
 *         in: body
 *         description:
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             country_id:
 *               type: string
 *             name:
 *               type: string
 *             phone_code:
 *               type: string
 *             active:
 *               type: boolean
 *
 *      responses:
 *        200:
 *          description: Successfully updated data.
 *        404:
 *          description: Country not found
 *        500:
 *          description: Internal Server Error
 */
router.put("/edit-country", ControllerWrapper(countries_controller.edit_country));

/**
 * @swagger
 * /countries/delete-country:
 *    delete:
 *      tags:
 *        - Countries
 *      summary: Delete a country.
 *      description: Refused with 409 when any village or question still references it.
 *      produces:
 *        - application/json
 *
 *      parameters:
 *       - name: id
 *         in: query
 *         description:
 *         required: true
 *         schema:
 *           type: string
 *
 *      responses:
 *        200:
 *          description: Successfully deleted data.
 *        409:
 *          description: Country is still in use
 *        500:
 *          description: Internal Server Error
 */
router.delete(
    "/delete-country",
    ControllerWrapper(countries_controller.delete_country)
);

module.exports = router;
