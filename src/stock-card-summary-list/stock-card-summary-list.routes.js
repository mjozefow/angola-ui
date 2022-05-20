/*
 * This program is part of the OpenLMIS logistics management information system platform software.
 * Copyright © 2017 VillageReach
 *
 * This program is free software: you can redistribute it and/or modify it under the terms
 * of the GNU Affero General Public License as published by the Free Software Foundation, either
 * version 3 of the License, or (at your option) any later version.
 *  
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. 
 * See the GNU Affero General Public License for more details. You should have received a copy of
 * the GNU Affero General Public License along with this program. If not, see
 * http://www.gnu.org/licenses.  For additional information contact info@OpenLMIS.org. 
 */

(function() {

    'use strict';

    angular
        .module('stock-card-summary-list')
        .config(routes);

    routes.$inject = ['$stateProvider', 'STOCKMANAGEMENT_RIGHTS'];

    function routes($stateProvider, STOCKMANAGEMENT_RIGHTS) {
        $stateProvider.state('openlmis.stockmanagement.stockCardSummaries', {
            isOffline: true,
            // ANGOLASUP-685: Starts here
            // eslint-disable-next-line max-len
            url: '/stockCardSummaries?facility&program&supervised&page&size&includeInactive&productCode&productName&lotCode',
            // ANGOLASUP-685: Ends here
            label: 'stockCardSummaryList.stockOnHand',
            priority: 1,
            showInNavigation: true,
            views: {
                '@openlmis': {
                    controller: 'StockCardSummaryListController',
                    controllerAs: 'vm',
                    templateUrl: 'stock-card-summary-list/stock-card-summary-list.html'
                }
            },
            accessRights: [STOCKMANAGEMENT_RIGHTS.STOCK_CARDS_VIEW],
            resolve: {
                facilityProgramData: function(facilityProgramCacheService, offlineService, $q) {
                    if (offlineService.isOffline()) {
                        return facilityProgramCacheService
                            .loadData('openlmis.stockmanagement.stockCardSummaries');
                    }
                    return $q.resolve();
                },
                params: function($stateParams) {
                    var paramsCopy = angular.copy($stateParams);

                    paramsCopy.facilityId = $stateParams.facility;
                    paramsCopy.programId = $stateParams.program;
                    paramsCopy.includeInactive = $stateParams.includeInactive;
                    paramsCopy.nonEmptyOnly = true;

                    // ANGOLASUP-685: Starts here
                    paramsCopy.productCode = $stateParams.productCode;
                    paramsCopy.productName = $stateParams.productName;
                    paramsCopy.lotCode = $stateParams.lotCode;
                    // ANGOLASUP-685: Ends here

                    delete paramsCopy.facility;
                    delete paramsCopy.program;
                    delete paramsCopy.supervised;

                    return paramsCopy;
                },
                // ANGOLASUP-685: Starts here
                stockCardSummaries: function(paginationService, StockCardSummaryRepository,
                    StockCardSummaryRepositoryImpl, $stateParams, offlineService, params) {
                    var originalPage = parseInt(params.page);
                    var originalPageSize = parseInt(params.size);

                    params.page = 0;
                    params.size = 2147483647;

                    // eslint-disable-next-line complexity
                    var itemFilterPredicateFromFilterParams = function(item) {
                        var isProductNameNullOrUndefined = params.productName !== null
                            && params.productName !== undefined;
                        if (isProductNameNullOrUndefined
                            && !item.orderable.fullProductName.toLocaleLowerCase()
                                .includes(params.productName.toLocaleLowerCase())) {
                            return false;
                        }

                        var isProductCodeNullOrUndefined = params.productCode !== null
                            && params.productCode !== undefined;
                        if (isProductCodeNullOrUndefined
                            && !item.orderable.productCode.includes(params.productCode)) {
                            return false;
                        }

                        var isLotCodeNullOrUndefined = params.lotCode !== null
                            && params.lotCode !== undefined;
                        if (isLotCodeNullOrUndefined
                            && (!item.orderable.lotCode || !item.orderable.lotCode.includes(params.lotCode))) {
                            return false;
                        }

                        return true;
                    };

                    var filterOutItemsByUserParamsFilter = function(itemsPageSpec, targetPage, targetPageSize) {
                        var itemsPageContent = itemsPageSpec.content.filter(itemFilterPredicateFromFilterParams);

                        var start = targetPage * targetPageSize;
                        var end = Math.min(itemsPageContent.length, start + targetPageSize);

                        var actualContent = start < end ? itemsPageContent.slice(start, end) : [];

                        var totalPages = Math.ceil(itemsPageContent.length / targetPageSize);

                        return new Page(
                            targetPage !== totalPages,
                            targetPage === totalPages,
                            targetPage,
                            actualContent.length,
                            targetPageSize,
                            itemsPageSpec.sort,
                            itemsPageContent.length,
                            totalPages,
                            actualContent
                        );
                    };

                    if (offlineService.isOffline() && $stateParams.program) {
                        return paginationService.registerList(null, $stateParams, function() {
                            return new StockCardSummaryRepository(new StockCardSummaryRepositoryImpl())
                                .query(params)
                                .then(function(itemsPage) {
                                    return filterOutItemsByUserParamsFilter(itemsPage, params.page, params.size);
                                })
                                .then(function(itemsPage) {
                                    return itemsPage.content;
                                });
                        }, {
                            customPageParamName: 'page',
                            customSizeParamName: 'size',
                            paginationId: 'stockCardList'
                        });
                    }

                    return paginationService.registerUrl($stateParams, function(stateParams) {
                        if (stateParams.program) {
                            return new StockCardSummaryRepository(new StockCardSummaryRepositoryImpl())
                                .query(params)
                                .then(function(itemsPage) {
                                    return filterOutItemsByUserParamsFilter(itemsPage, originalPage, originalPageSize);
                                });
                        }
                        return undefined;
                    }, {
                        customPageParamName: 'page',
                        customSizeParamName: 'size',
                        paginationId: 'stockCardList'
                    });
                }
            }
        });
    }

    // FIXME: Import this class from openlmis-ui-components.openlmis-pagination module
    function Page(first, last, number, numberOfElements, size, sort, totalElements,
                  totalPages, content) {

        this.first = first;
        this.last = last;
        this.number = number;
        this.numberOfElements = numberOfElements;
        this.size = size;
        this.sort = sort;
        this.totalElements = totalElements;
        this.totalPages = totalPages;
        this.content = content;
    }
    // ANGOLASUP-685: Ends here
})();